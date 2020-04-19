var logger = require("./logger");
var Web3 = require('web3');
const net = require('net');

var date;
date = new Date();
date = date.getUTCFullYear() + '-' +
    ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
    ('00' + date.getUTCDate()).slice(-2) + ' ' +
    ('00' + date.getUTCHours()).slice(-2) + ':' +
    ('00' + date.getUTCMinutes()).slice(-2) + ':' +
    ('00' + date.getUTCSeconds()).slice(-2);

// create an instance of web3 using the HTTP provider.
//var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8696"));

var web3;
if (!config.development) {
    web3 = new Web3(new Web3.providers.IpcProvider(process.env.HOME + '/.atheios/gath.ipc', net));
}
else {
    web3 = new Web3(new Web3.providers.IpcProvider(process.env.HOME +'/Library/atheios/gath.ipc', net));
}



var version = web3.version;
const ATHPASS=config.ATHPASS;
const ATHFEE= "0.00242002";

/*
var subscription = web3.eth.subscribe('pendingTransactions', function(error, result){
    if (!error) {
        logger.info("#server.ath: Subscription: %s",result);
    }
})
    .on("data", function(transaction){
        logger.info("#server.ath: Subscription TX: %s",transaction);
    });
*/

// unsubscribes the subscription
//subscription.unsubscribe(function(error, success){
//    if(success)
//        console.log('Successfully unsubscribed!');
//});

exports.athGetAddress = function(cb) {
    var rows;
    var accounts;
    var athaddress;

    web3.eth.personal.newAccount(ATHPASS, function (error, athaddress) {
        if (error) {
            logger.error("#server.ath.athGetAddress: Cannot create account");
            cb(error, null);
        } else {
            logger.info("#server.ath.athGetAddress: New address created: %s", athaddress);
            cb(null, athaddress);
        }
    }).catch(error => { logger.error('"#server.ath.athGetAddress: Error: %s', error.message); });
};

exports.athGetBalance = function(fromaddress, cb) {
    var rows;
    var accounts;
    var athaddress;
    var athamount;
    var weiamount;

    logger.info("#server.ath.athGetBalance: Address to get balance: %s", fromaddress);
    web3.eth.getBalance(fromaddress, function (error, weiamount) {
        if (error) {
            logger.error("#server.ath.athGetBalance: Error fetching ATH balance: %s", error);
            cb(error, null);
        } else {
            logger.info("#server.ath.athGetBalance: Amount in Wei %s", weiamount);
            athamount = web3.utils.fromWei(weiamount.toString(), 'ether');
            cb(0, athamount);
        }
    });
};

exports.athdoWithdraw= function(fromaddress, depositaddr, depositamount, cb) {
    var rows;
    var accounts;
    var weiamount;
    const depositweiamount = web3.utils.toWei(depositamount.toString());
    const BN_depositamount = web3.utils.toBN(depositweiamount);

    var BN_depositamountwithfee = BN_depositamount.add(web3.utils.toBN(web3.utils.toWei(ATHFEE)));


    logger.info("#server.ath.athdoWithdraw: depositamount %s", depositamount);

    // Check that we have a deposit amount larger 0
    if (depositamount === 0) {
        // No amount
        cb("Amount of ATH should be larger than the current fee to make the transaction: " + ATHFEE + " ATH.", null);
    }


    // Now let's check if we have enough money
    exports.athGetBalance(fromaddress, async (error, amount) => {
        var BN_amount = web3.utils.toWei(amount.toString());
        logger.info("#server.ath.athdoWithdraw: Amount: %s, Withdraw (incl fee) %s", BN_amount.toString(), BN_depositamountwithfee.toString());
        if (BN_depositamountwithfee.lt(BN_amount)) {
            logger.info("#server.ath.athdoWithdraw: Balance issue: Amount: %s, Withdraw (incl fee) %s", BN_amount.toString(), BN_depositamountwithfee.toString());
            cb("Not anough money to trigger the transfer. Check Your account", null);
        } else {
            // We have, so let's unlock the account
            // Unlock account for data
            logger.info("#server.ath.athdoWithdraw: Going to unlock account: %s", fromaddress);
            await web3.eth.personal.unlockAccount(fromaddress, ATHPASS, 50, async (error) => {
                if (error) {
                    logger.error("#server.ath.athdoWithdraw: Error: Unlock unsuccessful: %s" + rows[0].address);
                    cb("Can't unlock ATH account", null);
                } else {
                    logger.info("#server.ath.athdoWithdraw: Transferring from: %s, to %s, amount %s", fromaddress, depositaddr, depositamount);

                    await transfer_ath(fromaddress, depositaddr, depositamount, async (error, receipt) => {
                        if (error) {
                            logger.error("#server.ath.athdoWithdraw: Transfer failed: %s", error);
                            cb("Transfer failed: " + error, null);
                        } else {
                            logger.info("#server.ath.athdoWithdraw: transfer successful: %s",receipt);
                            cb(null, receipt);
                        }
                    });
                }
            });
        }
    });
};

// Send ath from an address to an address and with a certain amount
function transfer_ath(fromaddress, toaddress, amount, cb) {
    var lo_weiamount = web3.utils.toWei(amount.toString(), 'ether');
    var BN_amount = web3.utils.toBN(lo_weiamount);
    var lo_tx = null;

    web3.eth.getGasPrice(async (error, gasprice) => {

        // The amount includes already the trnasfer fee
        var sendAmount = BN_amount;
        logger.info("#server.ath.transfer_ath: Send addr: %s, Rec addr %s, Total wei: %s", fromaddress, toaddress, sendAmount);
        // Prepare the transaction to send the balance
        lo_tx = {
            from: fromaddress,
            to: toaddress,
            value: web3.utils.toHex(sendAmount)
        };

        logger.info("#server.ath.transfer_ath:  Send tx: %s", lo_tx);
        // we need to check which secret to user
        await web3.eth.personal.sendTransaction(lo_tx, ATHPASS, async (error, hash) => {
            if (error) {
                logger.error("#server.ath.transfer_ath: Error: %s", error);
                cb(error, null);
            } else {
                logger.info("#server.ath.transfer_ath: Hash: %s", hash);
                cb(null, hash);
            }
        })  .catch((error) => {
            logger.error("#server.ath.transfer_ath: Error: %s", error);
        });



    })  .catch((e) => {
        logger.error("#server.ath.transfer_ath: Error: %s", error);
    });
}



exports.athGetBlockNumber = function(cb) {
    web3.eth.getBlockNumber(function(error, result) {
        if(!error) {
            logger.info("#server.ath.athGetBlockNumber: blockNumber: %s", result);
            cb(null, result);
        } else {
            logger.error("#server.ath.athGetBlockNumber: Error: %s", error);
            cb(error, null);
        }
    });
};

exports.athGetHashrate = function(cb) {
    web3.eth.getBlockNumber(function(error, blockNum) {
        let sampleSize=4;
        if(!error) {
            web3.eth.getBlock(blockNum, true, function(error, result) {
                let t1=result.timestamp;
                web3.eth.getBlock(blockNum-sampleSize, true, function(error, result2) {
                    let t2=result2.timestamp;
                    let blockTime=(t1-t2)/sampleSize;
                    let difficulty=result.difficulty;
                    let hashrate=difficulty / blockTime;
                    cb(null, hashrate);
                });
            });


        } else {
            logger.error("#server.ath.athGetHashrate: Error: %s", error);
            cb(error, null);
        }
    });

};

exports.athGetBlockTime = function(cb) {
    web3.eth.getBlockNumber(function(error, blockNum) {
        let sampleSize=4;
        if(!error) {
            web3.eth.getBlock(blockNum, true, function(error, result) {
                let t1=result.timestamp;
                web3.eth.getBlock(blockNum-sampleSize, true, function(error, result2) {
                    let t2=result2.timestamp;
                    let blockTime=(t1-t2)/sampleSize;
                    cb(null, blockTime);
                });
            });


        } else {
            logger.error("#server.ath.athGetBlockTima: Error: %s", error);
            cb(error, null);
        }
    });

};

exports.athGetDifficulty = function(cb) {
    web3.eth.getBlockNumber(function(error, blockNum) {
        if(!error) {
            web3.eth.getBlock(blockNum, true, function(error, result) {
                let difficulty=result.difficulty;
                cb(null, difficulty);
            });


        } else {
            console.log("error", error);
            cb(error, null);
        }
    });

};

exports.athGetTransaction = function(cb) {
    var gasUsed=[];

    web3.eth.getBlockNumber(function(error, blockNum) {
        if(!error) {
            web3.eth.getBlock(blockNum, function(error, res) {
                if(!error) {
                    gasUsed[0]=res.gasUsed;
                    web3.eth.getBlock(blockNum-1, function(error, res) {
                        if(!error) {
                            gasUsed[1]=res.gasUsed;
                            web3.eth.getBlock(blockNum-2, function(error, res) {
                                if(!error) {
                                    gasUsed[2]=res.gasUsed;
                                    web3.eth.getBlock(blockNum-3, function(error, res) {
                                        if(!error) {
                                            gasUsed[3]=res.gasUsed;
                                            jsonstr='{ "gas" : [{"blocknr" : '+blockNum+', "gasUsed" : '+gasUsed[0]+'},'+
                                                '{"blocknr" : '+(blockNum-1)+',"gasUsed" : '+gasUsed[1]+'},'+
                                                '{"blocknr" : '+(blockNum-2)+',"gasUsed" : '+gasUsed[2]+'},'+
                                                '{"blocknr" : '+(blockNum-3)+',"gasUsed" : '+gasUsed[3]+'}]}';
                                            cb(null, jsonstr);


                                        } else {
                                            logger.error("#server.ath.athGetTransaction: Error: %s", error);
                                            cb(error, null);
                                        }
                                    });

                                } else {
                                    logger.error("#server.ath.athGetTransaction: Error: %s", error);
                                    cb(error, null);
                                }
                            });

                        } else {
                            logger.error("#server.ath.athGetTransaction: Error: %s", error);
                            cb(error, null);
                        }
                    });


                } else {
                    logger.error("#server.ath.athGetTransaction: Error: %s", error);
                    cb(error, null);
                }
            });



        } else {
            logger.error("#server.ath.athGetTransaction: Error: %s", error);
            cb(error, null);
        }
    });


};

