
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
from BlockchainFormation.blockchain_specifics.sawtooth.Sawtooth_Network import Sawtooth_Network

class Sawtooth_DApp:

    @staticmethod
    def startup(dapp_handler):
        """

        :param sawtooth_config:
        :param client_config:
        :param logger:
        :return:
        """

        logger = dapp_handler.logger
        sawtooth_config = dapp_handler.blockchain_config
        client_config = dapp_handler.client_config

        dir_name = os.path.dirname(os.path.realpath(__file__))
        src_name = os.path.realpath(os.path.dirname(os.path.dirname(dir_name)))
        # logger.debug(f"dir_name: {dir_name}")

        dapp_handler.create_ssh_scp_clients()

        logger.info("Installing the processors on the nodes")
        Sawtooth_Network.install_benchcontract(dapp_handler.blockchain_handler)

        logger.info("Setting up the clients with the sawtooth-specific files")

        logger.debug("Creating directories for raw and evaluation data")
        os.system(f"mkdir {client_config['exp_dir']}/benchmarking")

        logger.debug("Copying static client code and benchmarking code to setup directory in the experiment directory")
        os.system(f"cp -r {dir_name}/setup {client_config['exp_dir']}")
        os.system(f"cp {src_name}/benchmarking/benchmarking.js {client_config['exp_dir']}/setup")

        client_ssh_clients = dapp_handler.client_handler.ssh_clients
        client_scp_clients = dapp_handler.client_handler.scp_clients

        channels = []
        for client, _ in enumerate(client_config['priv_ips']):
            channel = Sawtooth_DApp.client_installation(sawtooth_config, client_config, client_ssh_clients, client_scp_clients, client, logger)
            channels.append(channel)

        logger.debug("Waiting until all installations have been completed")
        status_flags = wait_till_done(client_config, client_ssh_clients, client_config['ips'], 180, 10, "/home/ubuntu/setup/deploy.log", "Finished", 60, logger)

        if False in status_flags:
            raise Exception("Installation failed")

        logger.info("Installation and contract deployment were successful")
        logger.info("                                 ")
        logger.info("=================================")
        logger.info("      Client setup completed     ")
        logger.info("=================================")
        logger.info("                                 ")
        logger.info("Conducting a small test")
        logger.info("Currently disabled!!!!!")
        # TODO: make a small test for every client and read whether it has finished successfully - blockchain agnostic!
        # stdin, stdout, stderr = ssh_clients[0].exec_command("(cd /home/ubuntu/setup && . ~/.profile && node test.js)")
        # logger.debug("".join(stdout.readlines()))
        # logger.debug("".join(stderr.readlines()))
        logger.debug("Test finished")

        blockchain_ssh_clients = dapp_handler.client_handler.ssh_clients
        client_scp_clients = dapp_handler.client_handler.scp_clients

        stdin, stdout, stderr = blockchain_ssh_clients[0].exec_command("cat /home/ubuntu/bench.log")
        logger.debug("".join(stdout.readlines()))

        dapp_handler.close_ssh_scp_clients()

    @staticmethod
    def client_installation(sawtooth_config, client_config, client_ssh_clients, client_scp_clients, client, logger):
        """
        Install everything needed on the sawtooth clients
        :param sawtooth_config:
        :param client_config:
        :param client_ssh_clients:
        :param client_scp_clients:
        :param client:
        :param logger:
        :return:
        """

        # the number of sawwtooth nodes
        n = len(sawtooth_config['priv_ips'])
        # logger.debug("Creating config.json for this client - if there are more clients than node, one does modulo...")
        Sawtooth_DApp.write_config(client_config, sawtooth_config['priv_ips'][client % n])

        # logger.debug(f" --> Copying client setup stuff to client {client}")
        client_scp_clients[client].put(f"{client_config['exp_dir']}/setup", "/home/ubuntu", recursive=True)
        channel = client_ssh_clients[client].get_transport().open_session()
        channel.exec_command(f"(cd setup && . ~/.profile && npm install >> install.log && echo Finished >> deploy.log)")
        return channel

    @staticmethod
    def write_config(client_config, ip):

        config = dict()

        config["rest_address"] = f"http://{ip}:8008"

        config["keyspace_size"] = 10000
        config["valuespace_size"] = 10000

        with open(f"{client_config['exp_dir']}/setup/config.json", 'w+') as outfile:
            json.dump(config, outfile, default=datetimeconverter, indent=4)
