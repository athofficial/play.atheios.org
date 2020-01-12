
var date;
date = new Date();
date = date.getUTCFullYear() + '-' +
    ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
    ('00' + date.getUTCDate()).slice(-2) + ' ' +
    ('00' + date.getUTCHours()).slice(-2) + ':' +
    ('00' + date.getUTCMinutes()).slice(-2) + ':' +
    ('00' + date.getUTCSeconds()).slice(-2);

var Web3 = require('web3');
// create an instance of web3 using the HTTP provider.
//var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8696"));

var web3;
const net = require('net');
if (!process.env.production) {
    console.log("Production");
    web3 = new Web3(new Web3.providers.IpcProvider(process.env.HOME + '/.atheios/gath.ipc', net));
}
else {
    console.log("Development");
    web3 = new Web3(new Web3.providers.IpcProvider(process.env.HOME +'/Library/atheios/gath.ipc', net));
}



var version = web3.version;
console.log(" >>> DEBUG version: " + version);
const ATHPASS="2334frrweq536474hdbvsadjinu5gp34ngturqn";
const ATHFEE= "0.00242002";

exports.athGetAddress = function(cb) {
    var rows;
    var accounts;
    var athaddress;

    web3.eth.personal.newAccount(ATHPASS, function (error, athaddress) {
        if (error) {
            console.log('>>>> DEBUG getAddress : Can not create new Account');
            cb(error, null);
        } else {
            if (debugon)
                console.log('>>>> DEBUG getAddress : New address created:' + athaddress);
            cb(null, athaddress);
        }
    }).catch(error => { console.log('caught', error.message); });;
}

exports.athGetBalance = function(fromaddress, cb) {
    var rows;
    var accounts;
    var athaddress;
    var athamount;
    var weiamount;

    if (debugon)
        console.log('>>> DEBUG Address to get balance: ', fromaddress);

    web3.eth.getBalance(fromaddress, function (error, weiamount) {
        if (error) {
            // Any operations on the data retrieved from the query here.
            if (debugon)
                console.log('>>> DEBUG Address to get balance: ', fromaddress);
            cb(error, null);
        }
        if (debugon)
            console.log('>>> DEBUG Amount in Wei', weiamount);
        athamount = web3.utils.fromWei(weiamount, 'ether');
        cb(0, athamount);
    });
}

exports.athdoWithdraw= function(fromaddress, depositaddr, depositamount, cb) {
    var rows;
    var accounts;
    var weiamount;
    const depositweiamount = web3.utils.toWei(depositamount.toString());
    const BN_depositamount = web3.utils.toBN(depositweiamount);

    var BN_depositamountwithfee = BN_depositamount.add(web3.utils.toBN(web3.utils.toWei(ATHFEE)));


    if (debugon)
        console.log(' >>> DEBUG (fn=athdoWithdraw) depositamount', depositamount);

    // Check that we have a deposit amount larger 0
    if (depositamount === 0) {
        // No amount
        cb("Amount of ATH should be larger than the current fee to make the transaction: " + ATHFEE + " ATH.", null);
    }


    // Now let's check if we have enough money
    exports.athGetBalance(fromaddress, async (error, amount) => {
        var BN_amount = web3.utils.toWei(amount.toString());
        if (debugon)
            console.log(" >>> DEBUG (fn=athdoWithdraw) Amount: %s, Withdraw (incl fee) %s", BN_amount.toString(), BN_depositamountwithfee.toString());
        if (BN_depositamountwithfee.lt(BN_amount)) {
            if (debugon)
                console.log(" >>> DEBUG (fn=athdoWithdraw) Balance issue: Amount: %s, Withdraw (incl fee) %s", BN_amount.toString(), BN_depositamountwithfee.toString());
            cb("Not anough money to trigger the transfer. Check Your account", null);
        } else {
            // We have, so let's unlock the account
            // Unlock account for data
            if (debugon)
                console.log(" >>> DEBUG (fn=athdoWithdraw) Going to unlock account: %s", fromaddress);

            await web3.eth.personal.unlockAccount(fromaddress, ATHPASS, 50, async (error) => {
                if (error) {
                    if (debugon)
                        console.log('>>> DEBUG (fn=athdoWithdraw) Unlock unsuccessful: ' + rows[0].address);
                    cb("Can't unlock ATH account", null);
                } else {
                    if (debugon)
                        console.log(" >>> DEBUG (fn=athdoWithdraw) transferring from: %s, to %s, amount %s", fromaddress, depositaddr, depositamount);

                    await transfer_ath(fromaddress, depositaddr, depositamount, async (error, receipt) => {
                        if (error) {
                            console.log(' >>> DEBUG (fn=athdoWithdraw) Transfer failed', error);
                            cb("Transfer failed: " + error, null);
                        } else {
                            if (debugon)
                                console.log(" >>> DEBUG (fn=athdoWithdraw) transfer successful: %s",receipt);

                            cb(null, receipt);
                        }
                    });
                }
            });
            if (debugon)
                console.log(" >>> DEBUG (fn=athdoWithdraw) Past unlock");

        }
    });
}

// Send ath from an address to an address and with a certain amount
function transfer_ath(fromaddress, toaddress, amount, cb) {
    var lo_weiamount = web3.utils.toWei(amount.toString(), 'ether');
    var BN_amount = web3.utils.toBN(lo_weiamount);
    var lo_tx = null;

    if (debugon)
        console.log("DEBUG transfer_ath");

    web3.eth.getGasPrice(async (error, gasprice) => {

        // The amount includes already the trnasfer fee
        var sendAmount = BN_amount;

        if (debugon) {
            console.log('DEBUG transfer_ath' + ' >>> Send addr: ' + fromaddress);
            console.log('DEBUG transfer_ath' + ' >>> Rec addr: ' + toaddress);
            console.log('DEBUG transfer_ath' + ' >>> Cost: 0.00042002');
            console.log('DEBUG transfer_ath' + ' >>> Total wei to withdraw:  %s', sendAmount.toString());
        }
        // Prepare the transaction to send the balance
        lo_tx = {
            from: fromaddress,
            to: toaddress,
            value: web3.utils.toHex(sendAmount)
        };

        if (debugon) {
            console.log('DEBUG transfer_ath' + ' >>> Send tx: ');
            console.log(lo_tx);
        }
        // we need to check which secret to user
        await web3.eth.personal.sendTransaction(lo_tx, ATHPASS, async (error, hash) => {
            if (error) {
                if (debugon) {
                    console.log('DEBUG transfer_ath' + ' >>> web3.eth.personal.sendTransaction failed.');
                }
                cb(error, null);
            } else {
                if (debugon) {
                    console.log('DEBUG transfer_ath' + ' >>> Hash: ' + hash);
                }
                cb(null, hash);
            }
        })  .catch((e) => {
            if(debugon)
                console.log(e);
        });



    })  .catch((e) => {
        if(debugon)
            console.log(e);
    });
}



exports.athGetBlockNumber = function(cb) {
    web3.eth.getBlockNumber(function(error, result) {
        if(!error) {
            console.log(result);
            cb(null, result);
        } else {
            console.log("error", error);
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
            console.log("error", error);
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
            console.log("error", error);
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
                                            console.log("error", error);
                                            cb(error, null);
                                        }
                                    });

                                } else {
                                    console.log("error", error);
                                    cb(error, null);
                                }
                            });

                        } else {
                            console.log("error", error);
                            cb(error, null);
                        }
                    });


                } else {
                    console.log("error", error);
                    cb(error, null);
                }
            });



        } else {
            console.log("error", error);
            cb(error, null);
        }
    });


};

