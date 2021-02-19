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

import argparse
import json
import logging
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from BlockchainFormation.Node_Handler import Node_Handler
from DAppFormation.DApp_Handler import DApp_Handler

import copy


class ArgParser:

    def __init__(self):
        """Initialize an ArgParser object.
        The general structure of calls from the command line is:
        run.py --config path_to_config

        """

        self.parser = argparse.ArgumentParser(description='This script connects blockchains and clients and installs basic functionalities (Smart Contracts)',
                                              usage='Give path to config with all experiment relevant settings')
        self.parser.add_argument('--config', '-c', help='enter path to config file')

    def load_config(self, namespace_dict):
        """
        Loads the config from a given JSON file
        :param namespace_dict: namespace dict containing the config file path
        :return: config dict
        """
        if namespace_dict['config'].endswith('.json'):
            try:
                with open(namespace_dict['config']) as json_file:
                    return json.load(json_file)
            except:
                logger.error("ERROR: Problem loading the given config file")
        else:
            logger.exception("Config file needs to be of type JSON")
            raise Exception("Config file needs to be of type JSON")


if __name__ == '__main__':

    dir_name = os.path.dirname(os.path.realpath(__file__))

    logging.basicConfig(filename=f'{dir_name}/logger.log', level=logging.DEBUG,
                        format='%(asctime)s - %(threadName)s - %(name)s - %(levelname)s - %(message)s')

    # create logger with
    logger = logging.getLogger(__name__)
    # create console handler with a higher log level
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    # create formatter and add it to the handlers
    formatter = logging.Formatter('%(asctime)s - %(threadName)s - %(name)s - %(levelname)s - %(message)s')
    ch.setFormatter(formatter)
    # add the handlers to the logger
    logger.addHandler(ch)

    argparser = ArgParser()
    namespace = argparser.parser.parse_args()

    # loading the total experiment config
    dapp_config = argparser.load_config(vars(namespace))

    #  os.system(f"truncate -s 0 {dir_name}/logger.log")
    # os.truncate(path=f"{dir_name}/logger.log", length=10)

    blockchain_config = dapp_config['blockchain_settings']

    # Create Client VMs if needed with the same subnet/security/proxy settings as blockchain network
    if blockchain_config['instance_provision'] == "aws":

        client_config = copy.deepcopy(blockchain_config)

        # TODO Doo we need client_config and client_formation config? Only one should be enough right?
        # Delete blockchain specific settings from conf
        client_config.pop(f"{blockchain_config['blockchain_type']}_settings", None)

        # TODO Implement option to host client nodes in a different subnet. Needed since the private VPC subnets are rather small (<60 IPs available)

        client_config["vm_count"] = dapp_config['client_settings']["number_of_clients"]
        client_config["instance_type"] = dapp_config['client_settings']["client_type"]

        client_config["user"] = blockchain_config["user"]
        client_config["priv_key_path"] = blockchain_config["priv_key_path"]

    elif blockchain_config['instance_provision'] == "own":

        client_config = dapp_config['client_settings']

    if blockchain_config["blockchain_type"] == "indy":
        client_config["blockchain_type"] = "indy_client"
    elif blockchain_config["blockchain_type"] == "acapy":
        blockchain_config["blockchain_type"] = "indy"
        client_config["blockchain_type"] = "acapy"
    else:
        client_config["blockchain_type"] = "client"

    client_config["tag_name"] = dapp_config['client_settings']["tag_name"]
    client_config['exp_dir'] = dapp_config['client_settings']["exp_dir"]
    client_config["aws_region"] = dapp_config["client_settings"]["aws_region"]

    # Set this to None temporarily to allow threading
    client_config["client_settings"] = {
        # "target_network_conf": self.vm_handler_blockchain.get_config_path(),
        "target_network_conf": None
    }

    if blockchain_config["blockchain_type"] == "fabric":
        logger.info("Fabric selected - adding additional config")
        additional_config = copy.deepcopy(blockchain_config)
        # Insert prometheus_settings in fabric_config
        additional_config.pop(f"{blockchain_config['blockchain_type']}_settings", None)
        additional_config["vm_count"] = 1
        additional_config["instance_type"] = "m5.large"
        additional_config["user"] = blockchain_config["user"]
        additional_config["priv_key_path"] = blockchain_config["priv_key_path"]
        additional_config["prometheus_settings"] = {}
        additional_config["tag_name"] = "blclab_prometheus"
        additional_config["additional_settings"] = {
            "target_network_conf": None
        }
    else:
        additional_config = None


    logger.debug("Blockchain config:")
    logger.debug(json.dumps(blockchain_config))
    logger.debug("")
    logger.debug("Client config:")
    logger.debug(json.dumps(client_config))
    logger.debug("Additional config: ")
    logger.debug(json.dumps(additional_config))



    # Creating an instance of a dapp handler
    if blockchain_config["blockchain_type"] != "fabric":
        logger.info("Creating DApp_Handler without additional nodes")
        dapp_handler = DApp_Handler(Node_Handler(blockchain_config), Node_Handler(client_config), logger, None)
    else:
        loggger.info("Creating DApp_Hander with additional nodes")
        dapp_handler = DApp_Handler(Node_Handler(blockchain_config), Node_Handler(client_config), logger, Node_Handler(additional_config))


    logger.info("                                                          ")
    logger.info("==========================================================")
    logger.info("==========Starting Blockchain and Client Network==========")
    logger.info("==========================================================")
    logger.info("                                                          ")
    dapp_handler.start_dapp_network()

    # dapp_handler.terminate_dapp_network()

    logger.info("                                                        ")
    logger.info("========================================================")
    logger.info("======= Terminating Blockchain and Client Network ======")
    logger.info("========================================================")
    logger.info("                                                        ")
