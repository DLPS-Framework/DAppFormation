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

from BlockchainFormation.utils.utils import *


class Indy_DApp:

    @staticmethod
    def startup(dapp_handler):
        """

        :param indy_config:
        :param client_config:
        :param logger:
        :return:
        """

        logger = dapp_handler.logger
        indy_config = dapp_handler.blockchain_config
        client_config = dapp_handler.client_config

        src_name = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
        logger.debug(f"{src_name}")
        dir_name = os.path.dirname(os.path.realpath(__file__))

        logger.info("Setting up the clients with the indy-specific files")

        dapp_handler.create_ssh_scp_clients()

        indy_ssh_clients = dapp_handler.blockchain_handler.ssh_clients
        indy_scp_clients = dapp_handler.blockchain_handler.scp_clients

        client_ssh_clients = dapp_handler.client_handler.ssh_clients
        client_scp_clients = dapp_handler.client_handler.scp_clients

        indy_scp_clients[0].get("/data/indy/my-net/pool_transactions_genesis", f"{indy_config['exp_dir']}")

        for client, _ in enumerate(client_config['priv_ips']):
            stdin, stdout, stderr = client_ssh_clients[client].exec_command("mkdir /var/lib/indy/my-net")
            wait_and_log(stdout, stderr)

            client_scp_clients[client].put(f"{indy_config['exp_dir']}/pool_transactions_genesis", "/var/lib/indy/my-net/pool_transactions_genesis")

        logger.debug("Creating directories for raw and evaluation data")
        os.mkdir(f"{client_config['exp_dir']}/benchmarking")

        logger.debug("Copying static client code and benchmarking code to setup directory in the experiment directory")
        os.system(f"cp -r {src_name}/blockchain_specifics/indy/setup {client_config['exp_dir']}")
        os.system(f"cp {src_name}/benchmarking/benchmarking.js {client_config['exp_dir']}/setup")

        channels = []

        Indy_DApp.write_readMaterial(client_config)

        for client, _ in enumerate(client_config['priv_ips']):
            channel = Indy_DApp.client_installation(indy_config, client_config, client_ssh_clients, client_scp_clients, client, logger)
            channels.append(channel)

        logger.debug("Waiting until all installations have been completed")
        status_flags = wait_till_done(client_config, client_ssh_clients, client_config['ips'], 180, 10, "/home/ubuntu/setup/deploy.log",
                                      "Success", 60, logger, "tail -n 1")

        if False in status_flags:
            raise Exception("Installation failed")

        logger.info("==============================")
        logger.info("Indy and client setup finished")
        logger.info("==============================")

        logger.info("Conducting a small test on every client")
        # TODO: make a small test for every client and read whether it has finished successfully - blockchain agnostic!
        stdouts = []
        for index, _ in enumerate(client_config['priv_ips']):
            stdin, stdout, stderr = client_ssh_clients[index].exec_command("(cd /home/ubuntu/setup && . ~/.profile && node test.js >> /home/ubuntu/test.log)")
            stdouts.append(stdout)

        for index, _ in enumerate(client_config['priv_ips']):
            logger.debug("".join(stdouts[index].readlines()))

        dapp_handler.close_ssh_scp_clients()

    @staticmethod
    def client_installation(indy_config, client_config, client_ssh_clients, client_scp_clients, client, logger):
        """
        Install all needed dependencies and files and the clients
        :param indy_config:
        :param client_config:
        :param client_ssh_clients:
        :param client_scp_clients:
        :param client:
        :param logger:
        :return:
        """

        # the number of indy nodes
        n = len(indy_config['priv_ips'])

        # logger.debug("Creating config.json for this client")
        Indy_DApp.write_config(client_config, client % n + 1)

        # logger.debug(f" --> Copying client setup stuff to client {client}, installing packages and truffle and deploying smart contracts")
        client_scp_clients[client].put(f"{client_config['exp_dir']}/setup", "/home/ubuntu", recursive=True)
        stdin, stdout, stderr = client_ssh_clients[client].exec_command("nproc --all")
        out = stdout.readlines()
        logger.debug(out)
        logger.debug(stderr.readlines())
        num_cpus = int(out[0].replace("\n", ""))
        for j in range(0, num_cpus):
            stdin, stdout, stderr = client_ssh_clients[client].exec_command(f"cp /home/ubuntu/setup/readMaterial.json /home/ubuntu/setup/readMaterial{j}.json")
            logger.info(stdout.readlines())
            logger.info(stderr.readlines())

        channel = client_ssh_clients[client].get_transport().open_session()
        channel.exec_command(f"(cd setup && . ~/.profile && npm install >> install.log && echo 'Success' >> deploy.log)")

        return channel

    @staticmethod
    def write_config(client_config, steward_id):

        config = dict()

        config['pool_name'] = 'my-net'
        config["steward_id"] = f"{steward_id}"

        with open(f"{client_config['exp_dir']}/setup/config.json", 'w+') as outfile:
            json.dump(config, outfile, default=datetimeconverter, indent=4)

    @staticmethod
    def write_readMaterial(client_config):

        readMaterial = dict()

        readMaterial['wallets'] = []
        readMaterial['dids'] = []
        readMaterial['schemas'] = []
        readMaterial['credDefs'] = []
        readMaterial['revRegs'] = []
        readMaterial['creds'] = []

        """
        config['wallets'] = []
        config['DIDs'] = []
        config['schemaIDs'] = []
        config['credDefIDs'] = []
        config['credDefWallets'] = []
        config['credDefSchemaIDs'] = []
        config['revRegIDs'] = []
        config['revRegWallets'] = []
        config['revRegSchemaIDs'] = []
        """

        with open(f"{client_config['exp_dir']}/setup/readMaterial.json", 'w+') as outfile:
            json.dump(readMaterial, outfile, default=datetimeconverter, indent=4)
