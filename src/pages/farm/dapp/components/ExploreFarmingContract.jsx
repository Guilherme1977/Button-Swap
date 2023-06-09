import { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { useParams } from 'react-router';
import { FarmingComponent, SetupComponent, SetupComponentGen2 } from '../../../../components';
import Create from './Create';
import CreateOrEditFarmingSetups from './CreateOrEditFarmingSetups';
import { Coin } from '../../../../components/shared';
import Loading from '../../../../components/shared/Loading'

const ExploreFarmingContract = (props) => {
    const { dfoCore, farmAddress, withoutBack } = props;
    let { address } = useParams();
    if (!address) {
        address = farmAddress;
    }
    const [farmingSetups, setFarmingSetups] = useState([]);
    const [contract, setContract] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const [isAdd, setIsAdd] = useState(false);
    const [loading, setLoading] = useState(true);
    const [extension, setExtension] = useState(null);
    const [setupsLoading, setSetupsLoading] = useState(false);
    const [token, setToken] = useState(null);
    const [showOldSetups, setShowOldSetups] = useState(false);
    const [newFarmingSetups, setNewFarmingSetups] = useState([]);
    const [totalRewardToSend, setTotalRewardToSend] = useState(0);
    const [cumulativeRewardToSend, setCumulativeRewardToSend] = useState(0);
    const [CurrentSetupComponent, setCurrentSetupComponent] = useState(SetupComponent);
    const [generation, setGeneration] = useState('gen1');

    const ethRewardToken = {
        name: "Ethereum",
        symbol: "ETH",
        address: props.dfoCore.voidEthereumAddress,
        decimals: "18",
        image: `${process.env.PUBLIC_URL}/img/eth_logo.png`,
        contract: {
            options : {
                address : props.dfoCore.voidEthereumAddress
            },
            methods: {
                balanceOf(subject) {
                    return {
                        call(_, blockNumber) {
                            return props.dfoCore.web3.eth.getBalance(subject, blockNumber || null)
                        },
                        _parent : {
                            options : {
                                address : props.dfoCore.voidEthereumAddress
                            },
                            currentProvider : props.dfoCore.web3.currentProvider
                        },
                        _method : {
                            stateMutability : 'view'
                        },
                        encodeABI() {
                            return props.dfoCore.web3.utils.sha3('balanceOf(address)').substring(0, 10) + (props.dfoCore.web3.eth.abi.encodeParameter('address', subject).substring(2))
                        }
                    }
                },
                allowance(owner, spender) {
                    return {
                        async call() {
                            return window.numberToString(parseInt('0xfffffffffffffffffffffffffffffffffffffffffffffff'))
                        },
                        _parent : {
                            options : {
                                address : props.dfoCore.voidEthereumAddress
                            },
                            currentProvider : props.dfoCore.web3.currentProvider
                        },
                        _method : {
                            stateMutability : 'view'
                        },
                        encodeABI() {
                            return props.dfoCore.web3.utils.sha3('allowance(address,address)').substring(0, 10) + (props.dfoCore.web3.eth.abi.encodeParameters(['address', 'address'], [owner, spender || props.dfoCore.voidEthereumAddress]).substring(2))
                        }
                    }
                },
                name() {
                    return {
                        async call() {
                            return "Ethereum"
                        },
                        _parent : {
                            options : {
                                address : props.dfoCore.voidEthereumAddress
                            },
                            currentProvider : props.dfoCore.web3.currentProvider
                        },
                        _method : {
                            stateMutability : 'view'
                        },
                        encodeABI() {
                            return props.dfoCore.web3.utils.sha3('name()').substring(0, 10)
                        }
                    }
                },
                symbol() {
                    return {
                        async call() {
                            return "ETH"
                        },
                        _parent : {
                            options : {
                                address : props.dfoCore.voidEthereumAddress
                            },
                            currentProvider : props.dfoCore.web3.currentProvider
                        },
                        _method : {
                            stateMutability : 'view'
                        },
                        encodeABI() {
                            return props.dfoCore.web3.utils.sha3('symbol()').substring(0, 10)
                        }
                    }
                },
                decimals() {
                    return {
                        async call() {
                            return "18"
                        },
                        _parent : {
                            options : {
                                address : props.dfoCore.voidEthereumAddress
                            },
                            currentProvider : props.dfoCore.web3.currentProvider
                        },
                        _method : {
                            stateMutability : 'view'
                        },
                        encodeABI() {
                            return props.dfoCore.web3.utils.sha3('decimals()').substring(0, 10)
                        }
                    }
                }
            }
        }
    }

    useEffect(() => {
        if (dfoCore) {
            getContractMetadata();
        }
    }, []);


    const getContractMetadata = async () => {
        setLoading(true);
        try {
            var generation = await props.dfoCore.getFarmingContractGenerationByAddress(address);
            setGeneration(generation);
            const lmContract = await dfoCore.getContract(dfoCore.getContextElement(generation === 'gen2' ? "FarmMainGen2ABI" : 'FarmMainGen1ABI'), address);
            setCurrentSetupComponent(generation === 'gen2' ? SetupComponentGen2 : SetupComponent);
            setContract(lmContract);
            const rewardTokenAddress = await lmContract.methods._rewardTokenAddress().call();
            const rewardToken = rewardTokenAddress === props.dfoCore.voidEthereumAddress ? ethRewardToken.contract : await dfoCore.getContract(dfoCore.getContextElement("ERC20ABI"), rewardTokenAddress);
            const rewardTokenName = await rewardToken.methods.name().call();
            const rewardTokenSymbol = await rewardToken.methods.symbol().call();
            const rewardTokenDecimals = await rewardToken.methods.decimals().call();
            setToken({ name: rewardTokenName, symbol: rewardTokenSymbol, address: rewardTokenAddress, decimals: rewardTokenDecimals });
            const extensionAddress = await lmContract.methods.host().call();
            const extensionContract = await dfoCore.getContract(dfoCore.getContextElement(generation === 'gen2' ? "FarmExtensionGen2ABI" : 'FarmExtensionGen1ABI'), extensionAddress);
            setExtension(extensionContract);
            const { host, byMint } = await extensionContract.methods.data().call();
            const isHost = host.toLowerCase() === dfoCore.address.toLowerCase();
            setIsHost(isHost);
            const setups = await lmContract.methods.setups().call();
            const blockNumber = await dfoCore.getBlockNumber();
            const freeSetups = [];
            const lockedSetups = [];
            let totalFreeSetups = 0;
            let totalLockedSetups = 0;
            let rewardPerBlock = 0;
            let canActivateSetup = false;

            const res = [];
            for (let i = 0; i < setups.length; i++) {
                var { '0': setup, '1': setupInfo } = await props.dfoCore.loadFarmingSetup(lmContract, i);
                setupInfo = {...setupInfo, free : setupInfo.free || generation === 'gen2', generation}
                if (!canActivateSetup) {
                    canActivateSetup = parseInt(setupInfo.renewTimes) > 0 && !setup.active && parseInt(setupInfo.lastSetupIndex) === parseInt(i);
                }
                if (setup.rewardPerBlock !== "0") {
                    setupInfo.free ? totalFreeSetups += 1 : totalLockedSetups += 1;
                    res.push({ ...setup, setupInfo, rewardTokenAddress, setupIndex: i, finished: (parseInt(blockNumber) > parseInt(setup.endBlock) && parseInt(setup.endBlock) !== 0) || (parseInt(setup.endBlock) === 0 && parseInt(setupInfo.renewTimes) === 0) })
                }
                if (setup.active && (parseInt(setup.endBlock) > blockNumber)) {
                    setupInfo.free ? freeSetups.push(setup) : lockedSetups.push(setup);
                    rewardPerBlock += parseInt(setup.rewardPerBlock);
                }
            }
            const sortedRes = res.sort((a, b) => b.active - a.active);
            setFarmingSetups(sortedRes);

            const metadata = {
                name: rewardTokenName,
                symbol: rewardTokenSymbol,
                contractAddress: lmContract.options.address,
                rewardTokenAddress: rewardToken.options.address,
                rewardPerBlock: dfoCore.toDecimals(dfoCore.toFixed(rewardPerBlock).toString(), rewardTokenDecimals),
                byMint,
                freeSetups,
                lockedSetups,
                totalFreeSetups,
                totalLockedSetups,
                canActivateSetup,
                extension: `${extensionAddress.substring(0, 5)}...${extensionAddress.substring(extensionAddress.length - 3, extensionAddress.length)}`,
                fullExtension: `${extensionAddress}`,
                farmAddress: `${lmContract.options.address.substring(0, 5)}...${lmContract.options.address.substring(lmContract.options.address.length - 3, lmContract.options.address.length)}`,
                host: `${host.substring(0, 5)}...${host.substring(host.length - 3, host.length)}`,
                fullhost: `${host}`,
                generation
            };
            setMetadata({ contract: lmContract, metadata, isActive: freeSetups + lockedSetups > 0 || canActivateSetup });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const isWeth = (address) => {
        return (address.toLowerCase() === dfoCore.getContextElement('wethTokenAddress').toLowerCase()) || (address === dfoCore.voidEthereumAddress);
    }

    const addFarmingSetup = (setup) => {
        setNewFarmingSetups(newFarmingSetups.concat(setup));
    }

    const editFarmingSetup = (setup, index) => {
        const updatedSetups = newFarmingSetups.map((s, i) => {
            return i !== index ? s : setup;
        })
        setNewFarmingSetups(updatedSetups);
    }

    const removeFarmingSetup = (i) => {
        const updatedSetups = newFarmingSetups.filter((_, index) => index !== i);
        setNewFarmingSetups(updatedSetups);
    }

    const genConversion = {
        gen1 : {
            setupInfoTypes : ["bool","uint256","uint256","uint256","uint256","uint256","uint256","address","address","address","address","bool","uint256","uint256","uint256"],
            initTypes : [
                "address",
                "bytes",
                "address",
                "address",
                "bytes",
            ], async parseSetup(setup) {
                const ammAggregator = await props.dfoCore.getContract(props.dfoCore.getContextElement('AMMAggregatorABI'), props.dfoCore.getContextElement('ammAggregatorAddress'));
                const isFree = setup.free;
                const result = await ammAggregator.methods.findByLiquidityPool(setup.liquidityPoolToken.address).call();
                const { amm } = result;
                var mainTokenAddress = isFree ? setup.liquidityPoolToken.tokens[0].address : setup.mainToken.address;
                const mainTokenContract = await props.dfoCore.getContract(props.dfoCore.getContextElement('ERC20ABI'), mainTokenAddress);
                const mainTokenDecimals = mainTokenAddress === window.voidEthereumAddress ? 18 : await mainTokenContract.methods.decimals().call();

                const parsedSetup = [
                    isFree,
                    parseInt(setup.blockDuration),
                    parseInt(setup.startBlock),
                    window.numberToString(props.dfoCore.fromDecimals(window.numberToString(setup.rewardPerBlock), token.decimals)),
                    window.numberToString(props.dfoCore.fromDecimals(window.numberToString(setup.minStakeable), mainTokenDecimals)),
                    !isFree ? window.numberToString(props.dfoCore.fromDecimals(window.numberToString(setup.maxStakeable)), mainTokenDecimals) : 0,
                    setup.renewTimes,
                    amm,
                    setup.liquidityPoolToken.address,
                    mainTokenAddress,
                    props.dfoCore.voidEthereumAddress,
                    setup.involvingEth,
                    isFree ? 0 : props.dfoCore.fromDecimals(window.numberToString(parseFloat(setup.penaltyFee) / 100)),
                    0,
                    0
                ];
                return parsedSetup;
            }
        }, gen2 : {
            setupInfoTypes : ["uint256","uint256","uint256","uint256","uint256","address","address","bool","uint256","uint256","int24","int24"],
            initTypes :  [
                "address",
                "bytes",
                "address",
                "address",
                "address",
                "bytes",
            ], async parseSetup(setup) {
                var mainTokenAddress = setup.liquidityPoolToken.tokens[0].address;
                const mainTokenContract = await props.dfoCore.getContract(props.dfoCore.getContextElement('ERC20ABI'), mainTokenAddress);
                const mainTokenDecimals = mainTokenAddress === window.voidEthereumAddress ? 18 : await mainTokenContract.methods.decimals().call();

                const parsedSetup = [
                    parseInt(setup.blockDuration),
                    parseInt(setup.startBlock),
                    window.numberToString(props.dfoCore.fromDecimals(window.numberToString(setup.rewardPerBlock), token.decimals)),
                    window.numberToString(props.dfoCore.fromDecimals(window.numberToString(setup.minStakeable), mainTokenDecimals)),
                    setup.renewTimes,
                    setup.liquidityPoolToken.address,
                    mainTokenAddress,
                    setup.involvingEth,
                    0,
                    0,
                    setup.tickLower,
                    setup.tickUpper
                ];
                return parsedSetup;
            }
        }
    };

    const updateSetups = async () => {
        console.log(newFarmingSetups);
        setSetupsLoading(true);
        try {
            const newSetupsInfo = [];
            const ammAggregator = await dfoCore.getContract(dfoCore.getContextElement('AMMAggregatorABI'), dfoCore.getContextElement('ammAggregatorAddress'));
            var calculatedTotalToSend = "0";
            var cumulativeTotalToSend = "0";
            for (var i in newFarmingSetups) {
                const setup = newFarmingSetups[i];
                var amountToSend = props.dfoCore.web3.utils.toBN(window.numberToString(props.dfoCore.fromDecimals(window.numberToString(setup.rewardPerBlock), token.decimals)),
                ).mul(props.dfoCore.web3.utils.toBN(window.numberToString(setup.blockDuration))).toString();
                calculatedTotalToSend = props.dfoCore.web3.utils.toBN(calculatedTotalToSend).add(props.dfoCore.web3.utils.toBN(amountToSend)).toString();
                cumulativeTotalToSend = props.dfoCore.web3.utils.toBN(cumulativeTotalToSend).add(props.dfoCore.web3.utils.toBN(amountToSend).mul(props.dfoCore.web3.utils.toBN(window.numberToString(window.formatNumber(setup.renewTimes || '0') === 0 ? 1 : setup.renewTimes)))).toString();
                const info = await genConversion[generation].parseSetup(setup);
                const setupInfo = {
                    add: true,
                    disable: false,
                    index: 0,
                    info
                };
                newSetupsInfo.push(setupInfo);
            }
            console.log(newSetupsInfo);
            const gas = await extension.methods.setFarmingSetups(newSetupsInfo).estimateGas({ from: dfoCore.address });
            console.log(`gas ${gas}`);
            const result = await extension.methods.setFarmingSetups(newSetupsInfo).send({ from: dfoCore.address, gas });
            setTotalRewardToSend(calculatedTotalToSend);
            setCumulativeRewardToSend(calculatedTotalToSend);
        } catch (error) {
            console.error(error);
        } finally {
            setSetupsLoading(false);
            setIsAdd(false);
            setNewFarmingSetups([]);
            await getContractMetadata();
        }
    }


    if (loading) {
        return (<Loading />);
    }

    const lockedSetups = farmingSetups.filter((s) => !s.setupInfo.free && !s.finished);
    const freeSetups = farmingSetups.filter((s) => s.setupInfo.free && !s.finished);
    const finishedSetups = farmingSetups.filter((s) => s.finished);

    if (totalRewardToSend) {
        return (
            <div className="youDIDit">
                <h3 className="SuccessText">New Setups created!</h3>
                <p className="SuccessTextNow">And Now?</p>

                <p>Before attempting to activate setups, <b>remember to do every action needed to send at least {window.fromDecimals(totalRewardToSend, token.decimals, true)} {token.symbol}</b> to the extension contract:</p>
                <p className="SuccessTextLink"><a href={props.dfoCore.getContextElement("etherscanURL") + "address/" + metadata.metadata.fullExtension} target="_blank">{metadata.metadata.fullExtension}</a></p>
                <p>The total amount of tokens needed taking into acount all of the Repetable Setups are {window.fromDecimals(cumulativeRewardToSend, token.decimals, true)} {token.symbol} </p>

                <p>If you rule the Extension via a DFO or a DAO, be sure to vote to grant permissions from its Treasury.</p>
                <p className="Disclamerfinish">If you have set the "Repeat" functions in Setups, don't forget to track and fill the reward tokens before the end block. Suppose the Extension can't transfer the number of reward tokens needed to the Farming contract to reactivate a Setup (reward/Block from the new activation to the end block). In that case, the Setup'll fail its activation and automatically becomes Disactive. For more info, read the Documentation.</p>
                <p>
                    <br/>
                    <a href="javascript:;" onClick={() => setTotalRewardToSend("")}>Got it</a>
                </p>
            </div>
        );
    }

    return (
        <div className="ListOfThings">
            {
                (contract && metadata) ?
                    <div className="row">
                        <FarmingComponent className="FarmContractOpen" dfoCore={dfoCore} contract={metadata.contract} metadata={metadata.metadata} goBack={true} withoutBack={withoutBack} hostedBy={isHost} />
                    </div> : <div />
            }
            <div className="ListOfThings">
                {
                    (!isAdd && farmingSetups.length > 0) && <div>
                        {freeSetups.length > 0 && generation === "gen1" && <h3>Free setups</h3>}
                        {
                            freeSetups.map((farmingSetup) => {
                                return (
                                    <CurrentSetupComponent key={farmingSetup.setupIndex} className={generation === "gen2" ? "FarmSetupV3" : "FarmSetup"} setupIndex={farmingSetup.setupIndex} setupInfo={farmingSetup.setupInfo} lmContract={contract} dfoCore={dfoCore} setup={farmingSetup} hostedBy={isHost} hasBorder />
                                )
                            })
                        }
                        {lockedSetups.length > 0 && generation === "gen1" && <h3>Locked setups</h3>}
                        {
                            lockedSetups.map((farmingSetup) => {
                                return (
                                    <CurrentSetupComponent key={farmingSetup.setupIndex} className={generation === "gen2" ? "FarmSetupV3" : "FarmSetup"} setupIndex={farmingSetup.setupIndex} setupInfo={farmingSetup.setupInfo} lmContract={contract} dfoCore={dfoCore} setup={farmingSetup} hostedBy={isHost} hasBorder />
                                )
                            })
                        }
                        {finishedSetups.length > 0 && <a className="web2ActionBTN" onClick={() => setShowOldSetups(!showOldSetups)}>{`${showOldSetups ? 'Hide' : 'Show'} old setups`}</a>}
                        {
                            showOldSetups && finishedSetups.map((farmingSetup) => {
                                return (
                                    <CurrentSetupComponent key={farmingSetup.setupIndex} className={generation === "gen2" ? "FarmSetupV3" : "FarmSetup"} setupIndex={farmingSetup.setupIndex} setupInfo={farmingSetup.setupInfo} lmContract={contract} dfoCore={dfoCore} setup={farmingSetup} hostedBy={isHost} hasBorder />
                                )
                            })
                        }
                    </div>
                }
                {
                isHost && <>
                        { !isAdd && <a className="web2ActionBTN web2ActionBTNFFF" onClick={() => setIsAdd(true)}>Add new setups</a>}
                    </>
                }
                {
                    isAdd && <CreateOrEditFarmingSetups
                        rewardToken={token}
                        farmingSetups={newFarmingSetups}
                        onAddFarmingSetup={(setup) => addFarmingSetup(setup)}
                        onRemoveFarmingSetup={(i) => removeFarmingSetup(i)}
                        onEditFarmingSetup={(setup, i) => editFarmingSetup(setup, i)}
                        onCancel={() => { setNewFarmingSetups([]); setIsAdd(false); }}
                        onFinish={() => { }}
                        finishButton={setupsLoading ? <Loading /> : <button className="btn btn-primary" onClick={() => updateSetups()}>Update setups</button>}
                        forEdit={true}
                        generation={metadata.metadata.generation}
                    />
                }
            </div>
        </div>
    )
}

const mapStateToProps = (state) => {
    const { core } = state;
    return { dfoCore: core.dfoCore };
}

export default connect(mapStateToProps)(ExploreFarmingContract);