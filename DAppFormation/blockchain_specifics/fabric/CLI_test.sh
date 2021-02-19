#!/bin/bash

rm -f  test.log
start_time="$(date -u +%s%N)"
fabricQuery(){
    # peer chaincode invoke -o orderer1.example.com:7050 -C $CHANNEL_NAME -n benchcontract -c '{"Args":["doNothing"]}'
    peer chaincode query -C mychannel -n mycc -c '{"Args":["query","a"]}' >> test.log
}

test(){
    echo "Hallo" >> test.log
}


# export -f fabricQuery
# export -f test

# seq 10000 | parallel -j0 test

for i in {1..100}
do
    echo "result $(date) at run $i" >> test.log &
done



end_time="$(date -u +%s%N)"
elapsed="$((($end_time-$start_time)/1000000))"
echo "elapsed: $elapsed miliseconds"
