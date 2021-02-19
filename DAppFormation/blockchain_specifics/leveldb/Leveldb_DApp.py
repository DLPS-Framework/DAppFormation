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


class Leveldb_DApp:

    @staticmethod
    def startup(dapp_handler):

        logger = dapp_handler.logger
        leveldb_config = dapp_handler.blockchain_config
        client_config = dapp_handler.client_config

        dir_name = os.path.dirname(os.path.realpath(__file__))
        src_name = os.path.realpath(os.path.dirname(os.path.dirname(dir_name)))

        logger.info("Setting up the clients with the leveldb-specific files")

        dapp_handler.create_ssh_scp_clients()
        ssh_clients = dapp_handler.client_handler.ssh_clients
        scp_clients = dapp_handler.client_handler.scp_clients

        # join the docker swarm
        logger.info("Adding the clients to the docker swarm")
        for index, _ in enumerate(client_config['priv_ips']):

            stdin, stdout, stderr = ssh_clients[index].exec_command(f"{leveldb_config['join_command']}")
            out = stdout
            if out.readlines() != ['This node joined a swarm as a manager.\n']:
                logger.info("The client could not join the swarm")
            else:
                logger.info(f"Client {index} joined the swarm successfully")
            wait_and_log(stdout, stderr)

        logger.debug("Creating directories for raw and evaluation data")
        os.system(f"mkdir {client_config['exp_dir']}/benchmarking")

        logger.debug("Copying static client code and benchmarking code to setup directory in the experiment directory")
        os.system(f"cp -r {dir_name}/setup {client_config['exp_dir']}")
        os.system(f"cp {src_name}/benchmarking/benchmarking.js {client_config['exp_dir']}/setup")

        Leveldb_DApp.write_config(leveldb_config, client_config)

        for client, _ in enumerate(ssh_clients):
            scp_clients[client].put(f"{client_config['exp_dir']}/setup", "/home/ubuntu", recursive=True)
            channel = ssh_clients[client].get_transport().open_session()
            channel.exec_command(f"(cd setup && . ~/.profile && npm install >> install.log && echo 'Success' >> deploy.log)")

        logger.debug("Waiting until all installations have been completed")
        status_flags = wait_till_done(client_config, ssh_clients, client_config['ips'], 180, 10, "/home/ubuntu/setup/deploy.log", "Success", 60, logger)

        if False in status_flags:
            raise Exception("Installation failed")

        logger.info("Installation and contract deployment were successful")
        logger.info("                                 ")
        logger.info("=================================")
        logger.info("      Client setup completed     ")
        logger.info("=================================")
        logger.info("                                 ")
        logger.info("Conducting a small test")
        # TODO: make a small test for every client and read whether it has finished successfully - blockchain agnostic!
        stdin, stdout, stderr = ssh_clients[0].exec_command("(cd /home/ubuntu/setup && . ~/.profile && node test.js)")
        stdout2 = stdout
        logger.info("".join(stdout2.readlines()))
        wait_and_log(stdout, stderr)

        dapp_handler.close_ssh_scp_clients()

    @staticmethod
    def write_config(leveldb_config, client_config):

        config = dict()

        config["leveldb_address"] = f"{leveldb_config['priv_ips'][0]}:1337"
        config["keyspace_size"] = 10000
        config["valuespace_size"] = 10000

        with open(f"{client_config['exp_dir']}/setup/config.json", 'w+') as outfile:
            json.dump(config, outfile, default=datetimeconverter, indent=4)
