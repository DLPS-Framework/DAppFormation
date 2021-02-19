#  Copyright 2020  ChainLab
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
import subprocess

import numpy as np
from BlockchainFormation.blockchain_specifics.fabric.Fabric_Network import Fabric_Network
from BlockchainFormation.utils.utils import wait_till_done


class Fabric_DApp:

    @staticmethod
    def startup(dapp_handler):
        """
        Copies the needed files to the clients, install all needed packages and runs a test to verfiy the success
        :param fabric_config:
        :param client_config:
        :param logger:
        :return:
        """
        # TODO add more comments

        logger = dapp_handler.logger
        fabric_config = dapp_handler.blockchain_config
        client_config = dapp_handler.client_config

        if fabric_config["fabric_settings"]["prometheus"] == True:
            prometheus_config = dapp_handler.additional_config

        dir_name = os.path.dirname(os.path.realpath(__file__))
        src_name = os.path.realpath(os.path.dirname(os.path.dirname(dir_name)))

        dapp_handler.create_ssh_scp_clients()

        logger.info("Installing chaincode on the network")
        Fabric_Network.install_chaincode(dapp_handler.blockchain_handler)

        logger.info("Setting up the clients with the fabric-specific files")

        logger.debug("Creating directories for raw and evaluation data")
        os.system(f"mkdir {client_config['exp_dir']}/benchmarking")

        logger.debug("Copying static client setup stuff and benchmarking.js")
        os.system(f"cp -r {dir_name}/setup {client_config['exp_dir']}")
        os.system(f"mkdir {client_config['exp_dir']}/network")
        os.system(f"cp {src_name}/benchmarking/benchmarking.js {client_config['exp_dir']}/setup")

        logger.debug("Copying User-specific credentials")
        os.system(f"mkdir {client_config['exp_dir']}/setup/creds")

        logger.debug("Writing replacement script")
        Fabric_DApp.write_replacement(fabric_config, client_config)

        for org in range(1, fabric_config['fabric_settings']['org_count'] + 1):
            os.system(f"cp -r {fabric_config['exp_dir']}/setup/crypto-config/peerOrganizations/org{org}.example.com/users/User1@org{org}.example.com {client_config['exp_dir']}/setup/creds")

        logger.debug("Finalizing setup stuff for every client and push it to the clients")
        ssh_clients = dapp_handler.client_handler.ssh_clients
        scp_clients = dapp_handler.client_handler.scp_clients

        for client, _ in enumerate(ssh_clients):
            Fabric_DApp.client_installation(fabric_config, client_config, ssh_clients, scp_clients, client, logger)

        logger.debug("Waiting until all installations have been completed")
        status_flags = wait_till_done(fabric_config, ssh_clients, client_config['ips'], 300, 10, "/home/ubuntu/setup/deploy.log", "done", 180, logger)

        if False in status_flags:
            raise Exception("Installation failed")

        if fabric_config["fabric_settings"]["prometheus"] == True:
            logger.info("Setting up prometheus")
            prometheus_ssh_clients = dapp_handler.additional_handler.ssh_clients
            prometheus_scp_clients = dapp_handler.additional_handler.scp_clients

            Fabric_DApp.write_prometheus_yml(fabric_config, prometheus_config, logger)
            prometheus_scp_clients[0].put(f"{prometheus_config['exp_dir']}/setup/prometheus.yml", "/home/ubuntu/prometheus.yml")
            channel = prometheus_ssh_clients[0].get_transport().open_session()
            channel.exec_command("/home/ubuntu/prometheus/prometheus --config.file=/home/ubuntu/prometheus.yml")

            answer = input("Continue?")
            if answer.lower() in ["y", "yes"]:
                pass
            elif answer.lower() in ["n", "no"]:
                pass
            else:
                pass

        # for client, _ in enumerate(client_config["priv_ips"]):
            # stdin, stdout, stderr = ssh_clients[client].exec_command("cd /home/ubuntu/setup && chmod 775 ./stopAfterEndorsement.sh && ./stopAfterEndorsement.sh")
            # logger.info(stdout.readlines())
            # logger.info(stderr.readlines())


        logger.info("Installation and wallet creation were successful")
        logger.info("                                 ")
        logger.info("=================================")
        logger.info("      Client setup completed     ")
        logger.info("=================================")
        logger.info("                                 ")
        logger.info("Conducting a small test")
        stdin, stdout, stderr = ssh_clients[0].exec_command("(cd /home/ubuntu/setup && . ~/.profile && node test.js)")
        logger.debug("".join(stdout.readlines()))
        logger.debug("".join(stderr.readlines()))
        logger.debug("Test finished")

        dapp_handler.close_ssh_scp_clients()

    @staticmethod
    def write_network(fabric_config, client_config, client):
        """

        :param fabric_config:
        :param client_config:
        :param client:
        :return:
        """

        if fabric_config['fabric_settings']['tls_enabled'] == 1:
            http_string = "https"
            grpc_string = "grpcs"
        else:
            http_string = "http"
            grpc_string = "grpc"

        with open(f"{client_config['exp_dir']}/setup/network.json", "w+") as file:

            channel_id = int(((np.floor(np.float(client) / (np.float(fabric_config['fabric_settings']['org_count']) * fabric_config['fabric_settings']['peer_count']))) % fabric_config['fabric_settings']['channel_count']) + 1)

            network = {}
            network["name"] = "my-net"
            network["x-type"] = "hlfv1"
            network["x-commitTimeout"] = 60
            network["version"] = "1.0.0"
            network["channels"] = {}

            for channel_id in range(1, fabric_config['fabric_settings']['channel_count'] + 1):
                network["channels"][f"mychannel{channel_id}"] = {
                    "orderers": [],
                    "peers": {}
                }

            network["organizations"] = {}
            network["orderers"] = {}
            network["peers"] = {}
            network["certificateAuthorities"] = {}

            if fabric_config['fabric_settings']['endorsement_policy'] == "OR":
                endorsers_count = 1

            elif fabric_config['fabric_settings']['endorsement_policy'] == "ALL":
                endorsers_count = fabric_config['fabric_settings']['org_count']

            elif fabric_config['fabric_settings']['endorsement_policy'] >= 1 and fabric_config['fabric_settings']['endorsement_policy'] <= fabric_config['fabric_settings']['org_count']:
                endorsers_count = fabric_config['fabric_settings']['endorsement_policy']

            else:
                raise Exception("Invalid endorsement policy")

            org = client % fabric_config['fabric_settings']['org_count']

            # print(network)
            for channel_id in range(1, fabric_config['fabric_settings']['channel_count'] + 1):
                network["channels"][f"mychannel{channel_id}"]["orderers"].append(f"orderer{(org % fabric_config['fabric_settings']['orderer_count']) + 1}.example.com")

            orgs = []

            # for index in range(org, org + fabric_config['fabric_settings']['org_count']):
            for index in range(org, org + endorsers_count):
                orgs.append((index % (fabric_config['fabric_settings']['org_count'])) + 1)

            for org in range(0, fabric_config['fabric_settings']['org_count']):
                org = org + 1

                network["organizations"][f"Org{org}"] = {
                    "mspid": f"Org{org}MSP",
                    "peers": [],
                    "certificateAuthorities": [
                        f"ca_org{org}"
                    ]
                }

                for peer in range(0, fabric_config['fabric_settings']['peer_count']):
                    index_peer = fabric_config['peer_indices'][(org - 1) * fabric_config['fabric_settings']['peer_count'] + peer]
                    ip_peer = fabric_config['priv_ips'][index_peer]
                    if ((org in orgs) and (np.floor(np.float(client) / np.float(fabric_config['fabric_settings']['org_count']))) % (fabric_config['fabric_settings']['peer_count']) == peer):
                        for channel_id in range(1, fabric_config['fabric_settings']['channel_count'] + 1):
                            network["channels"][f"mychannel{channel_id}"]["peers"][f"peer{peer}.org{org}.example.com"] = {
                                "endorsingPeer": True,
                                "chaincodeQuery": True,
                                "eventSource": True
                            }
                    else:
                        pass

                    network["organizations"][f"Org{org}"]["peers"].append(f"peer{peer}.org{org}.example.com")

                    if fabric_config['fabric_settings']['tls_enabled'] == 1:
                        url_string = f"{grpc_string}://peer{peer}.org{org}.example.com:7051"
                    else:
                        url_string = f"{grpc_string}://{ip_peer}:7051"

                    network["peers"][f"peer{peer}.org{org}.example.com"] = {
                        "url": url_string,
                        "grpcOptions": {
                            "ssl-target-override": f"peer{peer}.org{org}.example.com"
                        },
                        "tlsCACerts": {
                            "pem": f"INSERT_ORG{org}_CA_CERT"
                        }
                    }

            for orderer, index_orderer in enumerate(fabric_config['orderer_indices']):
                orderer = orderer + 1

                ip_orderer = fabric_config['priv_ips'][index_orderer]

                network["orderers"][f"orderer{orderer}.example.com"] = {
                    "url": f"{grpc_string}://{ip_orderer}:7050",
                    "grpcOptions": {
                        "ssl-target-name-override": f"orderer{orderer}.example.com"
                    },
                    "tlsCACerts": {
                        "pem": f"INSERT_ORDERER{orderer}_CA_CERT"
                    }
                }

            """
            last_peer = list(network["channels"]["mychannel1"]["peers"])[-1]
            print(f"Last peer: {last_peer}")
            network["peers"][last_peer]["url"] = network["peers"][last_peer]["url"].replace("7051", "7061")
            print(network["peers"][last_peer]["url"])
            """

            json.dump(network, file, indent=4)

    @staticmethod
    def write_replacement(fabric_config, client_config):
        """
        TODO
        :param fabric_config:
        :param client_config:
        :return:
        """

        with open(f"{client_config['exp_dir']}/setup/replacement.sh", "w+") as f:

            f.write("#!/bin/bash\n\n")
            f.write("NETWORK=$1\nVERSION=$2\n\n")

            for peer_org in range(1, fabric_config['fabric_settings']['org_count'] + 1):
                f.write(f"ORG{peer_org}" + """_CERT=$(awk 'NF {sub(/\\r/, ""); printf "%s\\\\\\\\n",$0;}'""" + f" {fabric_config['exp_dir']}/setup/crypto-config/peerOrganizations/org{peer_org}.example.com/peers/peer0.org{peer_org}.example.com/tls/ca.crt )\n")

            for orderer in range(1, fabric_config['fabric_settings']['orderer_count'] + 1):
                f.write(f"ORDERER_CERT{orderer}" + """=$(awk 'NF {sub(/\\r/, ""); printf "%s\\\\\\\\n",$0;}'""" + f" {fabric_config['exp_dir']}/setup/crypto-config/ordererOrganizations/example.com/orderers/orderer{orderer}.example.com/tls/ca.crt )\n")
                f.write("\n")

            f.write("\n\n\n")

            for peer_org in range(1, fabric_config['fabric_settings']['org_count'] + 1):
                f.write(f'sed -i "s~INSERT_ORG{peer_org}_CA_CERT~$ORG{peer_org}_CERT~g"' + f" {client_config['exp_dir']}/setup/network.json\n")

            for orderer in range(1, fabric_config['fabric_settings']['orderer_count'] + 1):
                f.write(f'sed -i "s~INSERT_ORDERER{orderer}_CA_CERT~$ORDERER_CERT{orderer}~g"' + f" {client_config['exp_dir']}/setup/network.json\n")

            f.close()

    @staticmethod
    def write_config(fabric_config, client_config, org, client, sk_name):
        """

        :param client_config:
        :param org:
        :param sk_name:
        :return:
        """

        with open(f"{client_config['exp_dir']}/setup/config.json", "w+") as file:

            config = {}
            config["gateway"] = "./network.json"
            config["userName"] = f"User1@org{org}.example.com"
            config["MSPName"] = f"Org{org}MSP"
            config["keyName"] = sk_name

            if fabric_config['fabric_settings']['collection_index'] == "implicit":

                collections = []

                if fabric_config['fabric_settings']['private_fors'] == "all":
                    n = fabric_config['fabric_settings']['org_count']
                else:
                    n = fabric_config['fabric_settings']['private_fors']

                for index in range(n):
                    collections.append(f"_implicit_org_Org{((org + index) % fabric_config['fabric_settings']['org_count']) + 1}MSP")

            elif fabric_config['fabric_settings']['collection_index'] == "explicit":

                collections = f"Collection{org}"

            else:

                raise Exception("This type of collection is not implemented")

            config["collection"] = collections

            channel_id = int(((np.floor(np.float(client) / (np.float(fabric_config['fabric_settings']['org_count']) * fabric_config['fabric_settings']['peer_count']))) % fabric_config['fabric_settings']['channel_count']) + 1)

            config["channel"] = f"mychannel{channel_id}"
            config["channel_count"] = fabric_config["fabric_settings"]["channel_count"]
            config["keyspace_size"] = fabric_config["fabric_settings"]["keyspace_size"]
            config["valuespace_size"] = fabric_config["fabric_settings"]["valuespace_size"]

            json.dump(config, file, indent=4)

    @staticmethod
    def client_installation(fabric_config, client_config, ssh_clients, scp_clients, client, logger):
        """
        Install all needed dependencies and files and the clients
        :param fabric_config:
        :param client_config:
        :param ssh_clients:
        :param scp_clients:
        :param client:
        :param logger:
        :return:
        """

        # logger.debug("Writing network.json for client{client}")
        Fabric_DApp.write_network(fabric_config, client_config, client)

        org = (client % (fabric_config['fabric_settings']['org_count'])) + 1
        sk_name = subprocess.Popen(f"ls {client_config['exp_dir']}/setup/creds/User1@org{org}.example.com/msp/keystore/", shell=True, stdout=subprocess.PIPE).stdout.readlines()[0].decode("utf8").replace("\n", "")
        Fabric_DApp.write_config(fabric_config, client_config, org, client, sk_name)

        # logger.debug("Finalizing network.json")
        os.system(f"bash {client_config['exp_dir']}/setup/replacement.sh")
        scp_clients[client].put(f"{client_config['exp_dir']}/setup", "/home/ubuntu", recursive=True)
        os.system(f"mv {client_config['exp_dir']}/setup/network.json {client_config['exp_dir']}/network/network_client{client}.json")
        os.system(f"mv {client_config['exp_dir']}/setup/config.json {client_config['exp_dir']}/network/config_client{client}.json")

        channel = ssh_clients[client].get_transport().open_session()
        channel.exec_command("(cd /home/ubuntu/setup && . ~/.profile && npm install >> install.log; node addToWallet.js >> deploy.log)")


        # For debug mode on node SDK
        # logger.info("Starting SDK Client in debug mode")
        # stdin, stdout, stderr = ssh_clients[client].exec_command("export HFC_LOGGING='{\"debug\":\"console\",\"info\":\"console\"}'")
        # export HFC_LOGGING='{"debug":"console","info":"console"}'
        # logger.debug(stdout.readlines())
        # logger.debug(stderr.readlines())
        # performing benchmarking test

        # Adapting hosts because override does not seem to work
        if fabric_config['fabric_settings']['tls_enabled'] == 1:
            stdin, stdout, stderr = ssh_clients[client].exec_command("touch ~/hostadd")
            stdout.readlines()
            # logger.debug(stdout.readlines())
            # logger.debug(stderr.readlines())
            for org in range(1, fabric_config['fabric_settings']['org_count'] + 1):
                for peer in range(0, fabric_config['fabric_settings']['peer_count']):
                    index_peer = fabric_config['peer_indices'][(org - 1) * fabric_config['fabric_settings']['peer_count'] + peer]
                    ip_peer = fabric_config['priv_ips'][index_peer]
                    stdin, stdout, stderr = ssh_clients[client].exec_command(f"echo {ip_peer} peer{peer}.org{org}.example.com >> ~/hostadd")
                    stdout.readlines()
                    # logger.debug(stdout.readlines())
                    # logger.debug(stderr.readlines())

            stdin, stdout, stderr = ssh_clients[client].exec_command("sudo echo $(cat /etc/hosts) >> ~/hostadd")
            stdout.readlines()
            # logger.debug(stdout.readlines())
            # logger.debug(stderr.readlines())
            stdin, stdout, stderr = ssh_clients[client].exec_command("sudo mv ~/hostadd /etc/hosts")
            stdout.readlines()
            # logger.debug(stdout.readlines())
            # logger.debug(stderr.readlines())

    @staticmethod
    def write_prometheus_yml(fabric_config, prometheus_config, logger):

        list_peers_ips = [f'{fabric_config["ips"][index]}:9443' for index in fabric_config["peer_indices"]]
        list_orderer_ips = [f'{fabric_config["ips"][index]}:9442' for index in fabric_config["orderer_indices"]]
        logger.debug(f"peer ips: {list_peers_ips}")
        logger.debug(f"orderer ips: {list_orderer_ips}")


        f = open(f"{prometheus_config['exp_dir']}/setup/prometheus.yml", "w+")

        f.write(f"# my global config\n")
        f.write(f"global:\n")
        f.write(f"  scrape_interval:     15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.\n")
        f.write(f"  evaluation_interval: 15s # Evaluate rules every 15 seconds. The default is every 1 minute.\n")
        f.write(f"  # scrape_timeout is set to the global default (10s).\n")
        f.write(f"\n")
        f.write(f"# Alertmanager configuration\n")
        f.write(f"alerting:\n")
        f.write(f"  alertmanagers:\n")
        f.write(f"  - static_configs:\n")
        f.write(f"    - targets:\n")
        f.write(f"      # - alertmanager:9093\n")
        f.write(f"\n")
        f.write(f"# Load rules once and periodically evaluate them according to the global 'evaluation_interval'.\n")
        f.write(f"rule_files:\n")
        f.write(f"  # - 'first_rules.yml'\n")
        f.write(f"  # - 'second_rules.yml'\n")
        f.write(f"\n")
        f.write(f"# A scrape configuration containing exactly one endpoint to scrape:\n")
        f.write(f"# Here it's Prometheus itself.\n")
        f.write(f"scrape_configs:\n")
        f.write(f"  # The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.\n")
        f.write(f"  - job_name: 'prometheus'\n")
        f.write(f"\n")
        f.write(f"    # metrics_path defaults to '/metrics'\n")
        f.write(f"    # scheme defaults to 'http'.\n")
        f.write(f"\n")
        f.write(f"    static_configs:\n")
        f.write(f"    - targets: ['localhost:9090']\n")
        f.write(f"\n")
        f.write(f"  - job_name: 'fabric'\n")
        f.write(f"    scrape_interval: 2s\n")
        f.write(f"    static_configs:\n")
        f.write(f"      - targets: {list_peers_ips}\n")
        f.write(f"        labels:\n")
        f.write(f"          group: 'peers'\n")
        f.write(f"      - targets: {list_orderer_ips}\n")
        f.write(f"        labels:\n")
        f.write(f"          group: 'orderers'\n")

        f.close()
