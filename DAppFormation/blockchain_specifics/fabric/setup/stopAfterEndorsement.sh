#!/bin/bash

cd /home/ubuntu/setup
sed -i '/const {validResponses} = this._validatePeerResponses(proposalResponses);/a \\t\t\treturn validResponses[0].response.payload || null;' node_modules/fabric-network/lib/transaction.js
cd /home/ubuntu/setup && sed -i '/async submit(...args) {/a \\t\tvar start = Date.now();' node_modules/fabric-network/lib/transaction.js
cd /home/ubuntu/setup && sed -i '/const proposal = results\[1\];/a \\t\tlogger.info("sendTransactionProposal (%s) done: %s ms", txId, (Date.now()-start).toString());' node_modules/fabric-network/lib/transaction.js
cd /home/ubuntu/setup && sed -i '/let errorMsg = client_utils.checkProposalRequest(request, true);/a \\t\tvar start = Date.now();' ./node_modules/fabric-client/lib/Channel.js
cd /home/ubuntu/setup && sed -i '/const proposal = client_utils.buildSignedProposal(request, channelId, client_context);/a \\t\tlogger.info("buildSignedProposal done: %s ms", (Date.now()-start).toString()); start = Date.now();' ./node_modules/fabric-client/lib/Channel.js
cd /home/ubuntu/setup && sed -i '/const responses = await client_utils.sendPeersProposal(request.targets, proposal.signed, timeout);/a \\t\tlogger.info("sendPeersProposal done: %s ms", (Date.now()-start).toString());' ./node_modules/fabric-client/lib/Channel.js
cat node_modules/fabric-network/lib/transaction.js | grep validResponses[0].response.payload
echo "Success"