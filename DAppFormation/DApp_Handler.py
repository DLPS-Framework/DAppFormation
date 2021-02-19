#  Copyright 2021 ChainLab
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

import threading

from BlockchainFormation.blockchain_specifics.client.Client_Network import Client_Network
from BlockchainFormation.blockchain_specifics.indy_client.Indy_client_Network import Indy_client_Network
from DAppFormation.blockchain_specifics.couchdb.Couchdb_DApp import Couchdb_DApp
from DAppFormation.blockchain_specifics.empty.Empty_DApp import Empty_DApp
from DAppFormation.blockchain_specifics.ethereum.Ethereum_DApp import Ethereum_DApp
from DAppFormation.blockchain_specifics.fabric.Fabric_DApp import Fabric_DApp
from DAppFormation.blockchain_specifics.indy.Indy_DApp import Indy_DApp
from DAppFormation.blockchain_specifics.leveldb.Leveldb_DApp import Leveldb_DApp
from DAppFormation.blockchain_specifics.quorum.Quorum_DApp import Quorum_DApp
from DAppFormation.blockchain_specifics.sawtooth.Sawtooth_DApp import Sawtooth_DApp

class NetworkNotStartingError(Exception):
    """Base class for exceptions in this module."""
    pass


class DApp_Handler:
    """
    Class handling the creation of the blockchain network, execution of benchmarks and termination of the blockchain network.
    Also starts the evaluation process.
    """

    def __init__(self, blockchain_handler, client_handler, logger, additional_handler=None):

        self.blockchain_handler = blockchain_handler
        self.client_handler = client_handler
        self.additional_handler = additional_handler

        self.blockchain_config = blockchain_handler.config
        self.client_config = client_handler.config
        try:
            self.additional_config = additional_handler.config
        except:
            self.additional_config = None

        self.logger = logger

    def start_dapp_network(self):
        """
        Sets up the blockchain and client network
        :return:
        """

        try:
            blockchain_thread = threading.Thread(target=self.blockchain_handler.run_general_startup,
                                                 name=self.blockchain_config['blockchain_type'].capitalize() + "-Network")

            client_thread = threading.Thread(target=self.client_handler.run_general_startup,
                                             name=self.client_config['blockchain_type'].capitalize() + "-Network")

            blockchain_thread.start()
            client_thread.start()

            if self.blockchain_config['blockchain_type'] == "fabric" and self.blockchain_config['fabric_settings']['prometheus'] == True:
                prometheus_thread = threading.Thread(target=self.additional_handler.run_general_startup,
                                                     name="Prometheus-Server")
                prometheus_thread.start()
                prometheus_thread.join()

            blockchain_thread.join()
            client_thread.join()

            self.logger.info("Now attach stuff after parallelism is finished")
            self.logger.info(f"{self.blockchain_handler.get_config_path()}")
            self.client_handler.set_target_network_conf(self.blockchain_handler.get_config_path(), "client")

            if self.blockchain_config['blockchain_type'] == "fabric" and self.blockchain_config['fabric_settings']['prometheus'] == True:
                self.additional_handler.set_target_network_conf(self.blockchain_handler.get_config_path(), "additional")


            blockchain_type = self.blockchain_config['blockchain_type']
            client_type = self.client_config['blockchain_type']
            self.logger.info("Blockchain type: " + blockchain_type)
            self.logger.info("Client type: " + client_type)
            if blockchain_type == "indy" and client_type != "acapy":
                Indy_client_Network.attach_to_blockchain_conf(self.client_handler)
            elif blockchain_type == "indy" and client_type == "acapy":
                Acapy_Network.attach_to_blockchain_conf(self.client_handler)
            else:
                Client_Network.attach_to_blockchain_conf(self.client_handler)

            if blockchain_type in ["qldb"]:
                self.logger.warning("")
                self.logger.warning("")
                self.logger.warning(f"  !!! The automatic setup for {blockchain_type.upper()} is not yet working - still under active development  !!!")
                self.logger.warning("")
                self.logger.warning("")

            elif blockchain_type in ["geth", "parity", "ethermint"]:
                blockchain_type = "ethereum"

            try:
                if client_type == "acapy":
                    func = getattr(globals()[f"Acapy_DApp"], "startup")
                    func(self)
                else:
                    func = getattr(globals()[f"{blockchain_type.capitalize()}_DApp"], "startup")
                    func(self)

            except Exception as e:
                self.logger.exception(e)
                raise Exception("")


        except Exception as e:
            self.logger.exception(e)
            raise NetworkNotStartingError()

    def terminate_dapp_network(self):
        """
        Terminates the clients
        :return:
        """

        blockchain_termination_thread = threading.Thread(target=self.blockchain_handler.run_general_shutdown, name="Blockchain-Termination")
        client_termination_thread = threading.Thread(target=self.client_handler.run_general_shutdown, name="Client-Termination")

        blockchain_termination_thread.start()
        client_termination_thread.start()

        blockchain_termination_thread.join()
        client_termination_thread.join()

    def restart_blockchain(self, number_of_endorsers=None):
        if self.blockchain_handler.config["blockchain_type"] == "fabric":
            self.blockchain_handler.restart_network(number_of_endorsers)
        else:
            self.blockchain_handler.restart_network()

    def create_ssh_scp_clients(self):

        self.blockchain_handler.create_ssh_scp_clients()
        self.client_handler.create_ssh_scp_clients()

    def refresh_ssh_scp_clients(self):
        self.blockchain_handler.refresh_ssh_scp_clients()
        self.client_handler.refresh_ssh_scp_clients()

    def close_ssh_scp_clients(self):

        self.blockchain_handler.close_ssh_scp_clients()
        self.client_handler.close_ssh_scp_clients()
