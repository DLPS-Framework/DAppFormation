#  Copyright 2019  ChainLab
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

import json
import os
import time

from BlockchainFormation.Node_Handler import datetimeconverter
from BlockchainFormation.utils.utils import wait_till_done


class Ethereum_DApp:

    @staticmethod
    def startup(dapp_handler):
        """
        Copies the needed files to the clients, install all needed packages and runs a test to verfiy the success
        :param ethereum_config:
        :param client_config:
        :param logger:
        :return:
        """

        logger = dapp_handler.logger
        ethereum_config = dapp_handler.blockchain_config
        client_config = dapp_handler.client_config

        dir_name = os.path.dirname(os.path.realpath(__file__))
        src_name = os.path.realpath(os.path.dirname(os.path.dirname(dir_name)))

        logger.info("Setting up the clients with the ethereum-specific files")

        logger.debug("Creating directories for raw and evaluation data")
        os.system(f"mkdir {client_config['exp_dir']}/benchmarking")

        logger.debug("Copying static client code to setup directory in the experiment directory")
        os.system(f"cp -r {dir_name}/setup {client_config['exp_dir']}")
        os.system(f"cp {src_name}/benchmarking/benchmarking.js {client_config['exp_dir']}/setup")

        logger.debug("Writing truffle config")
        Ethereum_DApp.write_truffle_config(ethereum_config, client_config)

        logger.info("Installing truffle and necessary node-packages and deploying smart contracts on each client")

        dapp_handler.create_ssh_scp_clients()
        ssh_clients = dapp_handler.client_handler.ssh_clients
        scp_clients = dapp_handler.client_handler.scp_clients

        channels = []
        for client, _ in enumerate(client_config['priv_ips']):
            channel = Ethereum_DApp.client_installation(ethereum_config, client_config, ssh_clients, scp_clients, client, logger)
            channels.append(channel)

        logger.debug("Waiting until all installations have been completed")
        if False in wait_till_done(client_config, ssh_clients, client_config['ips'], 360, 10, "/home/ubuntu/setup/deploy.log", "Saving artifacts...", 60, logger, "tail -n 1"):
            raise Exception("Installation failed")

        # Geth/parity only have public contract, therefore no array is needed
        addresses = None
        hashes = None
        mode = "Public"
        for client, _ in enumerate(client_config['priv_ips']):
            if client == 0:
                stdin, stdout, stderr = ssh_clients[0].exec_command(f"cat /home/ubuntu/setup/build/contracts/BenchContract{mode}.json | grep address | sed -e 's/      \"address\": \"//g' | sed -e 's/\",//g'")
                addresses = stdout.readlines()[0].replace("\n", "")
                stdin, stdout, stderr = ssh_clients[0].exec_command(f"cat /home/ubuntu/setup/build/contracts/BenchContract{mode}.json | grep transactionHash | sed -e 's/      \"transactionHash\": \"//g' | sed -e 's/\"//g'")
                hashes = stdout.readlines()[0].replace("\n", "")

            else:
                addresses1 = [""]
                hashes1 = [""]
                stdin, stdout, stderr = ssh_clients[client].exec_command(f"cat /home/ubuntu/setup/build/contracts/BenchContract{mode}.json | grep address | sed -e 's/      \"address\": \"//g' | sed -e 's/\",//g'")
                addresses1 = stdout.readlines()[0].replace("\n", "")
                ssh_clients[client].exec_command(f"sed -i 's/{addresses1}/{addresses}/g' /home/ubuntu/setup/build/contracts/BenchContract{mode}.json")
                stdout.readlines()
                # logger.debug(stdout.readlines())
                # logger.debug(stderr.readlines())

                stdin, stdout, stderr = ssh_clients[client].exec_command(f"cat /home/ubuntu/setup/build/contracts/BenchContract{mode}.json | grep transactionHash | sed -e 's/      \"transactionHash\": \"//g' | sed -e 's/\"//g'")
                hashes1 = stdout.readlines()[0].replace("\n", "")
                ssh_clients[client].exec_command(f"sed -i 's/{hashes1}/{hashes}/g' /home/ubuntu/setup/build/contracts/BenchContract{mode}.json")
                stdout.readlines()
                # logger.debug(stdout.readlines())
                # logger.debug(stderr.readlines())

        logger.info("Installation and contract deployment were successful")
        logger.info("                                 ")
        logger.info("=================================")
        logger.info("      Client setup completed     ")
        logger.info("=================================")
        logger.info("                                 ")
        logger.info("Conducting a small test")
        stdin, stdout, stderr = ssh_clients[0].exec_command("(cd /home/ubuntu/setup && . ~/.profile && node test.js | grep -e writeDataPublic -e readDataPublic)")
        stdout.readlines()
        logger.debug("".join(stdout.readlines()))
        logger.debug("".join(stderr.readlines()))
        if len(ssh_clients) > 1:
            time.sleep(1)
            logger.info("Conducting the same test on another node")
            stdin, stdout, stderr = ssh_clients[1].exec_command("(cd /home/ubuntu/setup && . ~/.profile && node test.js | grep -e writeDataPublic -e readDataPublic)")
            stdout.readlines()
            # logger.debug("".join(stdout.readlines()))
            # logger.debug("".join(stderr.readlines()))
            logger.debug("Test finished")

        dapp_handler.close_ssh_scp_clients()

    @staticmethod
    def client_installation(ethereum_config, client_config, client_ssh_clients, client_scp_clients, client, logger):
        """
        Install all needed dependencies and files and the clients
        :param ethereum_config:
        :param client_config:
        :param client_ssh_clients:
        :param client_scp_clients:
        :param client:
        :param logger:
        :return:
        """

        # the number of quorum nodes
        n = len(ethereum_config['priv_ips'])
        # the private ip of the client's target node - if there are more clients than node, one does modulo...
        ip = ethereum_config['priv_ips'][client % n]
        try:
            account = f"{ethereum_config['coinbase'][client % n]}"
        except Exception as e:
            logger.exception(e)
            account = ""

        # logger.debug("Creating config.json for this client")
        Ethereum_DApp.write_config(client_config, ip, account)

        # logger.debug(f" --> Copying client setup stuff to client {client}, installing packages and truffle and deploying smart contracts")
        client_scp_clients[client].put(f"{client_config['exp_dir']}/setup", "/home/ubuntu", recursive=True)
        channel = client_ssh_clients[client].get_transport().open_session()
        channel.exec_command(f"(cd setup && . ~/.profile && npm install >> install.log && npm install -g truffle@4.1.16 >> install.log && . ~/.profile && truffle migrate --reset --network node{client % n} >> deploy.log)")
        return channel

    @staticmethod
    def write_truffle_config(ethereum_config, client_config):
        """
        Generates the truffle config file containing the deployment target for the smart contract and the deployment settings
        :param ethereum_config: Node Config containing information about the nodes
        :param client_config: Client Config containing information about the clients
        :return:
        """

        with open(f"{client_config['exp_dir']}/setup/truffle-config.js", "w+") as f:

            f.write("module.exports = {\n")
            f.write("  networks: {\n")

            for index, ip in enumerate(ethereum_config['priv_ips']):
                if index < len(ethereum_config['priv_ips']) - 1:
                    finish = ","
                else:
                    finish = ""

                f.write(f"    node{index}: " + "{\n")
                f.write(f"      host: \"{ip}\",\n")
                f.write("      port: 8545,\n")
                f.write("      network_id: \"*\",\n")
                f.write("      gasPrice: 50000000000,\n")
                f.write("      gas: 90000000,\n")
                f.write("    }" + finish + "\n")

            f.write("  }\n")
            f.write("};\n")

            f.close()

    @staticmethod
    def write_config(client_config, ip, account):

        config = dict()

        config["artifactPublic"] = "./build/contracts/BenchContractPublic.json"
        config["node"] = f"http://{ip}:8545"
        config["account"] = f"{account}"

        config["keyspace_size"] = 10000
        config["valuespace_size"] = 10000

        with open(f"{client_config['exp_dir']}/setup/config.json", 'w+') as outfile:
            json.dump(config, outfile, default=datetimeconverter, indent=4)
