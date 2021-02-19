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

from BlockchainFormation.utils.utils import *

class Quorum_DApp:

    @staticmethod
    def startup(dapp_handler):
        """
        Copies the needed files to the clients, install all needed packages and runs a test to verfiy the success
        :param quorum_config:
        :param client_config:
        :param logger:
        :return:
        """

        logger = dapp_handler.logger
        quorum_config = dapp_handler.blockchain_config
        client_config = dapp_handler.client_config

        dir_name = os.path.dirname(os.path.realpath(__file__))
        src_name = os.path.realpath(os.path.dirname(os.path.dirname(dir_name)))

        # logger.info("Adding zether for testing purposes")
        # Quorum_DApp.zether_startup(dapp_handler)

        logger.info("Setting up the clients with the quorum-specific files")

        logger.debug("Creating directories for raw and evaluation data")
        os.system(f"mkdir {client_config['exp_dir']}/benchmarking")

        logger.debug("Copying static client code and benchmarking code to setup directory in the experiment directory")
        os.system(f"cp -r {dir_name}/setup {client_config['exp_dir']}")
        os.system(f"cp {src_name}/benchmarking/benchmarking.js {client_config['exp_dir']}/setup")

        logger.debug("Writing truffle config")
        Quorum_DApp.write_truffle_config(quorum_config, client_config)

        logger.info("Installing truffle and necessary node-packages and deploying smart contracts on each client")

        dapp_handler.create_ssh_scp_clients()
        ssh_clients = dapp_handler.client_handler.ssh_clients
        scp_clients = dapp_handler.client_handler.scp_clients

        channels = []
        for client, _ in enumerate(client_config['priv_ips']):
            channel = Quorum_DApp.client_installation(quorum_config, client_config, ssh_clients, scp_clients, client, logger)
            channels.append(channel)

        logger.debug("Waiting until all installations have been completed")
        status_flags = wait_till_done(client_config, ssh_clients, client_config['ips'], 60, 10, "/home/ubuntu/setup/deploy.log", "Success...", 60, logger)

        if False in status_flags:
            logger.info("Retrying on the failed clients")
            for client, _ in enumerate(client_config['priv_ips']):
                if status_flags[client] == False:
                    logger.info(f"Retrying on client {client} on {client_config['ips'][client]}")
                    channel = Quorum_DApp.client_installation(quorum_config, client_config, ssh_clients, scp_clients, client, logger)
                    channels.append(channel)

            logger.debug("Waiting again until all installations have been completed")
            status_flags = wait_till_done(client_config, ssh_clients, client_config['ips'], 60, 10, "/home/ubuntu/setup/deploy.log", "Success...", 60, logger)
            if False in status_flags:
                raise Exception("Installation failed")


        addresses = ["", ""]
        hashes = ["", ""]
        for client, _ in enumerate(client_config['priv_ips']):
            if client == 0:
                for i, mode in enumerate(["Public", "Private"]):
                    stdin, stdout, stderr = ssh_clients[0].exec_command(f"cat /home/ubuntu/setup/build/contracts/BenchContract{mode}.json | grep address | grep -v int | grep -v type | grep -v name | head -n 1 |sed -e 's/      \"address\": \"//g' | sed -e 's/\",//g'")
                    addresses[i] = stdout.readlines()[0].replace("\n", "")
                    stdin, stdout, stderr = ssh_clients[0].exec_command(f"cat /home/ubuntu/setup/build/contracts/BenchContract{mode}.json | grep transactionHash | sed -e 's/      \"transactionHash\": \"//g' | sed -e 's/\"//g'")
                    hashes[i] = stdout.readlines()[0].replace("\n", "")

            else:
                addresses1 = ["", ""]
                hashes1 = ["", ""]
                for i, mode in enumerate(["Public", "Private"]):
                    stdin, stdout, stderr = ssh_clients[client].exec_command(f"cat /home/ubuntu/setup/build/contracts/BenchContract{mode}.json | grep address | grep -v int | grep -v type | grep -v name | head -n 1 |sed -e 's/      \"address\": \"//g' | sed -e 's/\",//g'")
                    addresses1[i] = stdout.readlines()[0].replace("\n", "")
                    ssh_clients[client].exec_command(f"sed -i 's/{addresses1[i]}/{addresses[i]}/g' /home/ubuntu/setup/build/contracts/BenchContract{mode}.json")
                    wait_and_log(stdout, stderr)

                    stdin, stdout, stderr = ssh_clients[client].exec_command(f"cat /home/ubuntu/setup/build/contracts/BenchContract{mode}.json | grep transactionHash | sed -e 's/      \"transactionHash\": \"//g' | sed -e 's/\"//g'")
                    hashes1[i] = stdout.readlines()[0].replace("\n", "")
                    ssh_clients[client].exec_command(f"sed -i 's/{hashes1[i]}/{hashes[i]}/g' /home/ubuntu/setup/build/contracts/BenchContract{mode}.json")
                    wait_and_log(stdout, stderr)

        logger.info("Installation and contract deployment were successful")
        logger.info("                                 ")
        logger.info("=================================")
        logger.info("      Client setup completed     ")
        logger.info("=================================")
        logger.info("                                 ")
        logger.info("Conducting a small test")
        # TODO: make a small test for every client and read whether it has finished successfully - blockchain agnostic!
        stdouts = []
        stderrs = []
        for index, _ in enumerate(client_config['priv_ips']):
            stdin, stdout, stderr = ssh_clients[index].exec_command("(cd /home/ubuntu/setup && . ~/.profile && node test.js)")
            stdouts.append(stdout)
            stderrs.append(stderr)

        for index, _ in enumerate(client_config['priv_ips']):
            logger.info("".join(stdouts[index].readlines()))
            logger.info("".join(stderrs[index].readlines()))
            wait_and_log(stdout, stderr)

        """
        if len(ssh_clients) > 1:
            time.sleep(1)
            logger.info("Conducting the same test on another node")
            stdin, stdout, stderr = ssh_clients[1].exec_command("(cd /home/ubuntu/setup && . ~/.profile && node test.js | grep -e writeDataPublic -e readDataPublic)")
            wait_and_log(stdout, stderr)
            logger.debug("Test finished")
        """

        dapp_handler.close_ssh_scp_clients()


    @staticmethod
    def zether_startup(dapp_handler):

        dir_name = os.path.dirname(os.path.realpath(__file__))

        logger = dapp_handler.logger
        quorum_config = dapp_handler.blockchain_config
        client_config = dapp_handler.client_config

        os.system(f"mkdir {client_config['exp_dir']}/zether_setup")

        n = len(quorum_config['priv_ips'])

        dapp_handler.create_ssh_scp_clients()
        ssh_clients = dapp_handler.client_handler.ssh_clients
        scp_clients = dapp_handler.client_handler.scp_clients

        for client, _ in enumerate(client_config['priv_ips']):
            channel = ssh_clients[client].get_transport().open_session()
            channel.exec_command("(cd /home/ubuntu && git clone https://github.com/jpmorganchase/anonymous-zether.git && curl -o- -L https://yarnpkg.com/install.sh | bash >> ~/yarn.log; echo 'export PATH=/home/ubuntu/.yarn/bin:/home/ubuntu/.config/yarn/global/node_modules/.bin:$PATH' >> ~/.profile && . ~/.profile && cd anonymous-zether && yarn >> ~/yarn.log && rm -r packages/protocol/migrations && rm -r packages/protocol/truffle-config.js && rm -r packages/example && echo 'Success' >> /home/ubuntu/clone.log)")

        status_flags = wait_till_done(client_config, ssh_clients, client_config['ips'], 120, 30, "/home/ubuntu/clone.log", "Success", 60, logger, "tail -n 1")
        if False in status_flags:
            raise Exception("Installation failed")

        logger.info("Installations successful")
        logger.info("Customizing the anonymous-zether repo and deploying the contracts")

        for client, _ in enumerate(client_config['priv_ips']):
            Quorum_DApp.write_truffle_config_zether(quorum_config, client_config)
            ip = quorum_config['priv_ips'][client % n]
            from_account = f"0x{quorum_config['addresses'][client % n]}"
            target_account = f"0x{quorum_config['addresses'][(client + 1) % n]}"
            Quorum_DApp.write_config_zether(client_config, ip, from_account, target_account)
            scp_clients[client].put(f"{dir_name}/zether_setup/migrations", "/home/ubuntu/anonymous-zether/packages/protocol", recursive=True)
            scp_clients[client].put(f"{client_config['exp_dir']}/zether_setup/truffle-config.js", "/home/ubuntu/anonymous-zether/packages/protocol")
            scp_clients[client].put(f"{dir_name}/zether_setup/example", "/home/ubuntu/anonymous-zether/packages", recursive=True)
            scp_clients[client].put(f"{client_config['exp_dir']}/zether_setup/config.json", "/home/ubuntu/anonymous-zether/packages/example")

        for client, _ in enumerate(client_config['priv_ips']):
            channel = ssh_clients[client].get_transport().open_session()
            channel.exec_command(f"(. ~/.profile && cd anonymous-zether/packages/protocol && npm install && npm install -g truffle@5.1.39 && truffle migrate --network node{client % n} --reset >> /home/ubuntu/zether.log && echo 'Finished...' >> /home/ubuntu/zether.log)")

        status_flags = wait_till_done(client_config, ssh_clients, client_config['ips'], 120, 30, "/home/ubuntu/zether.log", "Finished...", 60, logger, "tail -n 1")
        if False in status_flags:
            raise Exception("Installation failed")

        logger.info("Installation successful")

        """
        logger.info("Collecting the contract addresses")

        addresses = {}
        hashes = {}
        for client, _ in enumerate(client_config['priv_ips']):
            if client == 0:
                for _, contract in enumerate(["BurnVerifier", "CashToken", "InnerProductVerifier", "Migrations", "ZetherVerifier", "ZSC"]):
                    stdin, stdout, stderr = ssh_clients[0].exec_command(f"cat /home/ubuntu/anonymous-zether/packages/protocol/build/contracts/{contract}.json | grep address | grep -v int | grep -v type | grep -v name | sed -e 's/      \"address\": \"//g' | sed -e 's/\",//g'")
                    addresses[contract] = stdout.readlines()[0].replace("\n", "")
                    stdin, stdout, stderr = ssh_clients[0].exec_command(f"cat /home/ubuntu/anonymous-zether/packages/protocol/build/contracts/{contract}.json | grep transactionHash | sed -e 's/      \"transactionHash\": \"//g' | sed -e 's/\"//g'")
                    hashes[contract] = stdout.readlines()[0].replace("\n", "")

                print(addresses)
                print(hashes)

            else:
                addresses1 = {}
                hashes1 = {}
                for contract in addresses:
                    stdin, stdout, stderr = ssh_clients[client].exec_command(f"cat /home/ubuntu/anonymous-zether/packages/protocol/build/contracts/{contract}.json | grep address | grep -v int | grep -v type | grep -v name | sed -e 's/      \"address\": \"//g' | sed -e 's/\",//g'")
                    addresses1[contract] = stdout.readlines()[0].replace("\n", "")
                    ssh_clients[client].exec_command(f"sed -i 's/{addresses1[contract]}/{addresses[contract]}/g' /home/ubuntu/anonymous-zether/packages/protocol/build/contracts/{contract}.json")
                    wait_and_log(stdout, stderr)

                    stdin, stdout, stderr = ssh_clients[client].exec_command(f"cat /home/ubuntu/anonymous-zether/packages/protocol/build/contracts/{contract}.json | grep transactionHash | sed -e 's/      \"transactionHash\": \"//g' | sed -e 's/\"//g'")
                    hashes1[contract] = stdout.readlines()[0].replace("\n", "")
                    ssh_clients[client].exec_command(f"sed -i 's/{hashes1[contract]}/{hashes[contract]}/g' /home/ubuntu/anonymous-zether/packages/protocol/build/contracts/{contract}.json")
                    wait_and_log(stdout, stderr)

                print(addresses1)
                print(hashes1)

        """
        # TODO extend if there are more clients than nodes
        for client in range(min(len(quorum_config['priv_ips']), len(client_config['priv_ips']))):
        # Initiating the zether contract
            stdin, stdout, stderr = ssh_clients[client].exec_command(". ~/.profile && cd anonymous-zether/packages/example && node init.js")
            logger.info(stdout.readlines())
            logger.info(stderr.readlines())


        # Registering all accounts
        registrations = []
        for client in range(min(len(quorum_config['priv_ips']), len(client_config['priv_ips']))):
            stdin, stdout, stderr = ssh_clients[client].exec_command(". ~/.profile && cd anonymous-zether/packages/example && node register.js | grep Alice")
            out = stdout.readlines()
            logger.info(out)
            logger.info(stderr.readlines())

            registrations.append(out[0].replace("\n", "").replace("Alice: ", "").split(","))

        logger.info(f"Client addresses: {registrations}")

        quorum_config['registrations'] = registrations




    @staticmethod
    def client_installation(quorum_config, client_config, client_ssh_clients, client_scp_clients, client, logger):
        """
        Install all needed dependencies and files and the clients
        :param quorum_config:
        :param client_config:
        :param client_ssh_clients:
        :param client_scp_clients:
        :param client:
        :param logger:
        :return:
        """

        # the number of quorum nodes
        n = len(quorum_config['priv_ips'])
        # the private ip of the client's target node - if there are more clients than node, one does modulo...
        ip = quorum_config['priv_ips'][client % n]
        account = f"0x{quorum_config['addresses'][client % n]}"
        try:
            receiver = quorum_config['registrations'][(client + 1) % n]
            others = []
            # TODO adapt if client and node numbers are different
            for index in range(0, len(quorum_config['priv_ips'])):
                if index != (client % n) and index != ((client + 1) % n):
                    others.append(quorum_config['registrations'][index])
        except:
            receiver = ""
            others = []


        tessera_public_keys = quorum_config['tessera_public_keys']
        # logger.debug(f"Number of tessera public keys: {len(tessera_public_keys)}")

        # the public keys of the tessera nodes - relevant for private transactions only
        # currently, the private fors consist of all other nodes, i.e. a priori any node can get/send a private transaction

        string = quorum_config["quorum_settings"]["private_fors"]
        tessera_public_keys_deployment = []
        if (string == "all"):
            for index, key in enumerate(tessera_public_keys):
                if index != (client % n):
                    tessera_public_keys_deployment.append(key)

        elif string[0] == "+":
            if (len(client_config['ips']) > len(quorum_config['ips'])):
                raise Exception("This has not been implemented yet")

            count = int(string[1:], 10)
            help = []
            for index in range(0, 2*len(tessera_public_keys)):
                help.append(tessera_public_keys[index%len(tessera_public_keys)])

            for index, key in enumerate(help[client+1:client+count+1]):
                tessera_public_keys_deployment.append(key)

        else:
            count = int(string)
            if count > len(tessera_public_keys):
                raise Exception("There cannot be more private fors than nodes")

            for index in range(1, count + 1):
                tessera_public_keys_deployment.append(tessera_public_keys[(client + index) % n])

        tessera_public_keys_calling = tessera_public_keys_deployment
        tessera_public_keys_deployment = tessera_public_keys

        # logger.info(f"Public fors for calling on client {client}: {tessera_public_keys_calling}")


        # logger.debug("Creating config.json for this client")
        Quorum_DApp.write_config(client_config, ip, account, receiver, others, tessera_public_keys_deployment, tessera_public_keys_calling)

        # logger.debug(f" --> Copying client setup stuff to client {client}, installing packages and truffle and deploying smart contracts")
        client_scp_clients[client].put(f"{client_config['exp_dir']}/setup", "/home/ubuntu", recursive=True)
        channel = client_ssh_clients[client].get_transport().open_session()
        channel.exec_command(f"(cd setup && . ~/.profile && npm install >> install.log && npm install -g truffle@5.1.39 >> install.log && . ~/.profile && truffle migrate --network node{client % n} --reset >> deploy.log && echo 'Success...' >> deploy.log)")

        return channel


    @staticmethod
    def write_truffle_config(quorum_config, client_config):
        """
        Generates the truffle config file containing the deployment target for the smart contract and the deployment settings
        :param quorum_config_config: Node Config containing information about the nodes
        :param client_config: Client Config containing information about the clients
        :return:
        """

        with open(f"{client_config['exp_dir']}/setup/truffle-config.js", "w+") as f:

            f.write("module.exports = {\n")
            f.write("  networks: {\n")

            for index, ip in enumerate(quorum_config['priv_ips']):
                if index < len(quorum_config['priv_ips']) - 1:
                    finish = ","
                else:
                    finish = ""

                f.write(f"    node{index}: " + "{\n")
                f.write(f"      host: \"{ip}\",\n")
                f.write("      port: 22000,\n")
                f.write("      network_id: \"*\",\n")
                f.write("      gasPrice: 0,\n")
                f.write("      gas: 300000000,\n")
                f.write("      type: \"quorum\"\n")
                f.write("    }" + finish + "\n")

            f.write("  }\n")
            f.write("};\n")

            f.close()

    @staticmethod
    def write_truffle_config_zether(quorum_config, client_config):

        with open(f"{client_config['exp_dir']}/zether_setup/truffle-config.js", "w+") as f:

            f.write("module.exports = {\n")
            f.write("  networks: {\n")

            for index, ip in enumerate(quorum_config['priv_ips']):
                if index < len(quorum_config['priv_ips']) - 1:
                    finish = ","
                else:
                    finish = ""

                f.write(f"    node{index}: " + "{\n")
                f.write(f"      host: \"{ip}\",\n")
                f.write("      port: 22000,\n")
                f.write("      network_id: \"*\",\n")
                f.write("      gasPrice: 0,\n")
                f.write("      gas: 300000000,\n")
                f.write("      type: \"quorum\"\n")
                f.write("    }" + finish + "\n")

            f.write("  },\n")
            f.write("  compilers: {\n")
            f.write("      solc: {\n")
            f.write("            version: \"0.5.4\",\n")
            f.write("      }\n")
            f.write("  }\n")
            f.write("};\n")


    @staticmethod
    def write_config(client_config, ip, account, receiver, others, tessera_public_keys_deployment, tessera_public_keys_calling):

        config = dict()

        config["artifactPrivate"] = "./build/contracts/BenchContractPrivate.json"
        config["artifactPublic"] = "./build/contracts/BenchContractPublic.json"
        config["node"] = f"http://{ip}:22000"
        config["account"] = f"{account}"
        config["tessera_public_keys_deployment"] = []
        config["tessera_public_keys_calling"] = []

        config["sender"] = account
        config["receiver"] = receiver
        config["others"] = others

        for _, key in enumerate(tessera_public_keys_deployment):
            config["tessera_public_keys_deployment"].append(key)

        for _, key in enumerate(tessera_public_keys_calling):
            config["tessera_public_keys_calling"].append(key)

        config["keyspace_size"] = 10000
        config["valuespace_size"] = 10000

        with open(f"{client_config['exp_dir']}/setup/config.json", 'w+') as outfile:
            json.dump(config, outfile, default=datetimeconverter, indent=4)

    @staticmethod
    def write_config_zether(client_config, ip, from_account, target_account):

        config = dict()
        config["node"] = f"http://{ip}:22000"
        config["account"] = f"{from_account}"

        with open(f"{client_config['exp_dir']}/zether_setup/config.json", 'w+') as outfile:
            json.dump(config, outfile, default=datetimeconverter, indent=4)
