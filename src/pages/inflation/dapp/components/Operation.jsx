import { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { addEntry } from '../../../../store/actions';
import { Coin, Input, TokenInput } from '../../../../components/shared';

const Operation = (props) => {
    const { entry, onCancel, onFinish, operation } = props;
    const [step, setStep] = useState(0);
    // first step
    const [actionType, setActionType] = useState("");
    // second step
    const [inputToken, setInputToken] = useState(null);
    const [inputTokenMethod, setInputTokenMethod] = useState("");
    // third step
    const [transferType, setTransferType] = useState("");
    const [percentage, setPercentage] = useState(0);
    const [amount, setAmount] = useState(0);
    const [currentReceiver, setCurrentReceiver] = useState("");
    const [pathTokens, setPathTokens] = useState([]);
    const [receivers, setReceivers] = useState([]);
    // general
    const [loading, setLoading] = useState(false);

    // check if an entry has been passed in the props
    useEffect(() => {
        if (operation) {
            setActionType(operation.actionType);
            onSelectInputToken(operation.inputToken ? operation.inputToken.address ? operation.inputToken.address : operation.inputToken : null);
            setInputTokenMethod(operation.inputTokenMethod)
            setAmount(operation.amount);
            setPercentage(operation.percentage);
            setTransferType(operation.transferType);
            setReceivers(operation.receivers);
            setPathTokens(operation.pathTokens);
        }
    }, []);

    // second step methods
    const onSelectInputToken = async (address) => {
        if (!address) return;
        setLoading(true);
        const inputTokenContract = await props.dfoCore.getContract(props.dfoCore.getContextElement('ERC20ABI'), address);
        const symbol = await inputTokenContract.methods.symbol().call();
        const decimals = await inputTokenContract.methods.decimals().call();
        setInputToken({ symbol, address, decimals });
        setLoading(false);
    }

    // third step methods
    const isValidPercentage = () => {
        var hasIncoherent = false;
        for(var receiver of receivers) {
            if(receiver.percentage <= 0 || receiver.percentage > 100) {
                hasIncoherent = true;
            }
        }
        const totalPercentage = receivers.map((receiver) => receiver.percentage).reduce((acc, num) => acc + num);
        return totalPercentage == 100 && !hasIncoherent;
    }

    const onPercentageChange = (index, percentage) => {
        var cumulate = percentage = parseInt(percentage);
        const updatedReceivers = receivers.map((receiver, i) => {
            if (i === index) {
                return { ...receiver, percentage };
            }
            if(i === receivers.length - 1) {
                return {...receiver, percentage: 100 - cumulate};
            }
            cumulate += receiver.percentage;
            return receiver;
        });
        setReceivers(updatedReceivers);
    }

    const onAddPathToken = async (address) => {
        if (!address) return;
        setLoading(true);
        try {
            console.log(pathTokens);
            const lastOutputToken = pathTokens.length === 0 ? inputToken.address.toLowerCase() : pathTokens[pathTokens.length - 1].outputTokenAddress;
            console.log(`lot: ${lastOutputToken}`);
            const ammAggregator = await props.dfoCore.getContract(props.dfoCore.getContextElement('AMMAggregatorABI'), props.dfoCore.getContextElement('ammAggregatorAddress'));
            const info = await ammAggregator.methods.info(address).call();
            const ammContract = await props.dfoCore.getContract(props.dfoCore.getContextElement("AMMABI"), info['amm']);
            const lpInfo = await ammContract.methods.byLiquidityPool(address).call();
            const lpTokensAddresses = lpInfo[2];
            const ammData = await ammContract.methods.data().call();
            const ethAddress = ammData[0];
            const symbols = [];
            let outputTokenAddress = null;
            let hasLastOutputToken = false;
            for (let i = 0; i < lpTokensAddresses.length; i++) {
                const currentTokenAddress = lpTokensAddresses[i];
                if (ethAddress.toLowerCase() === currentTokenAddress) {
                    symbols.push('ETH');
                } else {
                    if (lpTokensAddresses.length === 2 && currentTokenAddress.toLowerCase() !== lastOutputToken) {
                        outputTokenAddress = currentTokenAddress;
                    }
                    const currentToken = await props.dfoCore.getContract(props.dfoCore.getContextElement('ERC20ABI'), currentTokenAddress);
                    const currentTokenSymbol = await currentToken.methods.symbol().call();
                    symbols.push(currentTokenSymbol);
                }
                if (lastOutputToken.toLowerCase() === currentTokenAddress.toLowerCase()) {
                    hasLastOutputToken = true;
                }
            }
            if (!hasLastOutputToken) {
                return;
            }
            const pathTokenContract = await props.dfoCore.getContract(props.dfoCore.getContextElement('ERC20ABI'), address);
            const symbol = await pathTokenContract.methods.symbol().call();
            const decimals = await pathTokenContract.methods.decimals().call();
            setPathTokens(pathTokens.concat({ symbol, address, decimals, output: null, outputTokenAddress, lpTokensAddresses, symbols }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const getEntry = () => {
        return {
            actionType,
            inputToken,
            inputTokenMethod,
            amount,
            percentage,
            transferType,
            receivers,
            pathTokens,
            index: operation ? operation.index : -1
        }
    }

    // step retrieval methods
    const getStep = () => {
        switch (step) {
            case 0:
                return getFirstStep();
            case 1:
                return getSecondStep();
            case 2:
                return getThirdStep();
            case 3:
                return getFourthStep();
            default:
                return <div />
        }
    }

    const getFirstStep = () => {
        return <div className="col-12">
            <div className="row flex-column align-items-start mb-4">
                <h6 className="text-secondary"><b>Inflation Entry Operation</b></h6>
            </div>
            <div className="row justify-content-center mb-4">
                <h6><b>Select action type</b></h6>
            </div>
            <div className="row justify-content-center mb-4">
                <button onClick={() => setActionType(actionType !== 'transfer' ? 'transfer' : "")} className={`btn ${actionType === 'transfer' ? "btn-secondary" : "btn-outline-secondary"} mr-4`}>Transfer</button>
                <button onClick={() => setActionType(actionType !== 'swap' ? 'swap' : "")} className={`btn ${actionType === 'swap' ? "btn-secondary" : "btn-outline-secondary"}`}>Swap</button>
            </div>
            <div className="row mb-4">
                <p style={{ fontSize: 14 }}>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Quaerat animi ipsam nemo at nobis odit temporibus autem possimus quae vel, ratione numquam modi rem accusamus, veniam neque voluptates necessitatibus enim!</p>
            </div>
            <div className="row justify-content-center">
                <button onClick={() => {
                    setActionType("");
                    props.cancelEditOperation();
                }} className="btn btn-light mr-4">Cancel</button>
                <button onClick={() => setStep(1)} disabled={!actionType} className="btn btn-primary">Next</button>
            </div>
        </div>
    }

    const getSecondStep = () => {
        return <div className="col-12 flex flex-column align-items-center">
            <div className="row">
                <TokenInput tokenAddress={inputToken ? inputToken.address : ''} label={"Input token"} placeholder={"Input token address"} width={60} onClick={(address) => onSelectInputToken(address)} text={"Load"} />
            </div>
            {
                !inputToken &&
                <div className="row mb-4">
                    <p style={{ fontSize: 12 }}>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Quaerat animi ipsam nemo at nobis odit temporibus autem possimus quae vel, ratione numquam modi rem accusamus, veniam neque voluptates necessitatibus enim!</p>
                </div>
            }
            {
                loading ? <div className="row justify-content-center">
                    <div className="spinner-border text-secondary" role="status">
                        <span className="visually-hidden"></span>
                    </div>
                </div> : <>
                        <div className="row mb-4">
                            {inputToken && <div className="col-12">
                                <b>{inputToken.symbol}</b> <Coin address={inputToken.address} className="ml-2" />
                            </div>
                            }
                        </div>
                        <div className="row w-50 mb-4">
                            <select value={inputTokenMethod} onChange={(e) => setInputTokenMethod(e.target.value)} className="custom-select wusd-pair-select">
                                <option value="">Select method</option>
                                <option value="mint">By mint</option>
                                <option value="reserve">By reserve</option>
                            </select>
                        </div>
                        <div className="row mb-4">
                            <p style={{ fontSize: 12 }}>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Quaerat animi ipsam nemo at nobis odit temporibus autem possimus quae vel, ratione numquam modi rem accusamus, veniam neque voluptates necessitatibus enim!</p>
                        </div>
                    </>
            }
            <div className="row justify-content-center">
                <button onClick={() => {
                    setStep(step - 1);
                }} className="btn btn-light mr-4">Back</button>
                <button onClick={() => setStep(2)} disabled={!inputToken || !inputTokenMethod} className="btn btn-secondary">Next</button>
            </div>
        </div>
    }

    const getTransferThirdStep = () => {
        return <>
            <div className="row mb-4">
                <h6 className="text-secondary"><b>Transfer</b></h6>
            </div>
            <div className="row w-50 mb-4">
                <select value={transferType} onChange={(e) => setTransferType(e.target.value)} className="custom-select wusd-pair-select">
                    <option value="">Select type</option>
                    <option value="percentage">Percentage</option>
                    <option value="amount">Amount</option>
                </select>
            </div>
            {
                transferType ?
                    transferType == 'percentage' ?
                        <div className="row mb-4 justify-content-center align-items-center">
                            <input type="number" min={0} max={100} value={percentage} onChange={(e) => setPercentage(e.target.value)} className="form-control mr-2" style={{ width: '33%' }} />% of {inputToken.symbol} <Coin address={inputToken.address} className="ml-2" />
                        </div>
                        :
                        <div className="row mb-4 justify-content-center align-items-center">
                            <Input showCoin={true} address={inputToken.address} name={inputToken.symbol} value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>
                    : <div />
            }
            {
                transferType ? <>
                    <div className="row">
                        <h6><b>Receiver</b></h6>
                    </div>
                    <div className="row">
                        <div className="input-group mb-3">
                            <input type="text" value={currentReceiver} onChange={(e) => setCurrentReceiver(e.target.value)} className="form-control" placeholder="Address" aria-label="Receiver" aria-describedby="button-add" />
                            <button onClick={() => {
                                if (!window.isEthereumAddress(currentReceiver)) return;
                                const exists = receivers.filter((r) => r.address.toLowerCase() === currentReceiver.toLowerCase()).length > 0;
                                if (exists) return;
                                setReceivers(receivers.concat({ address: currentReceiver, percentage: receivers.length === 0 ? 100 : 0 }));
                                setCurrentReceiver("");
                            }} className="btn btn-outline-secondary ml-2" type="button" id="button-add">Add</button>
                        </div>
                    </div>
                    <div className="row mb-4">
                        {
                            receivers.map((receiver, index) => {
                                return (
                                    <div key={receiver.address} className="col-12 mb-2">
                                        <div className="row align-items-center">
                                            <div className="col-md-8 col-12">
                                                <b>{receiver.address}</b>
                                            </div>
                                            <div className="col-md-2 col-12">
                                                {index !== receivers.length - 1 && <input type="number" min={0} max={100} onChange={(e) => onPercentageChange(index, e.target.value)} className="form-control mr-1" value={receiver.percentage} />}
                                                {index === receivers.length - 1 && receivers.length !== 1 && <span>{receiver.percentage}</span>}
                                            </div>
                                            <div className="col-md-2 col-12">
                                                <button onClick={() => setReceivers(receivers.filter((_, i) => i !== index))} className="btn btn-danger btn-sm">X</button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </div>
                </> : <div />
            }
        </>
    }

    function onTransferChange(e) {
        setPercentage('');
        setAmount('');
        setTransferType(e.target.value);
        console.log(e.target.value);
    }

    const getSwapThirdStep = () => {
        return <>
            <div className="row mb-4">
                <h6 className="text-secondary"><b>Swap</b></h6>
            </div>
            <div className="row w-50 mb-4">
                <select value={transferType} onChange={onTransferChange} className="custom-select wusd-pair-select">
                    <option value="">Select type</option>
                    <option value="percentage">Percentage</option>
                    <option value="amount">Amount</option>
                </select>
            </div>
            {
                transferType ?
                    transferType == 'percentage' ?
                        <div className="row mb-4 justify-content-center align-items-center">
                            <input type="number" min={0} max={100} value={percentage} onChange={(e) => setPercentage(e.target.value)} className="form-control mr-2" style={{ width: '33%' }} />% of {inputToken.symbol} <Coin address={inputToken.address} className="ml-2" />
                        </div>
                        :
                        <div className="row mb-4 justify-content-center align-items-center">
                            <Input showCoin={true} address={inputToken.address} name={inputToken.symbol} value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>
                    : <div />
            }
            <div className="row mb-4">
                <TokenInput label={"Path"} placeholder={"LPT address"} width={60} onClick={(address) => onAddPathToken(address)} text={"Load"} />
            </div>
            {
                loading ? <div className="row justify-content-center">
                    <div className="spinner-border text-secondary" role="status">
                        <span className="visually-hidden"></span>
                    </div>
                </div> : <>
                        {
                            pathTokens.length > 0 && pathTokens.map((pathToken, index) => {
                                return (
                                    <>
                                        <div className="row mb-4">
                                            {pathToken && <div className="col-12">
                                                <b>{pathToken.symbol} {pathToken.symbols.map((symbol) => <span>{symbol} </span>)}</b> {index === pathTokens.length - 1 ? <button className="btn btn-sm btn-outline-danger ml-1" onClick={() => setPathTokens(pathTokens.filter((_, i) => i !== index))}><b>Remove</b></button> : <div />}
                                            </div>
                                            }
                                        </div>
                                        <div className="row w-50 mb-4">
                                            <select value={pathToken.output} disabled={index !== pathTokens.length - 1} onChange={(e) => setPathTokens(pathTokens.map((pt, i) => i === index ? { ...pt, outputTokenAddress: e.target.value } : pt))} className="custom-select wusd-pair-select">
                                                {
                                                    pathToken.lpTokensAddresses.map((lpTokenAddress, lpTokenIndex) => {
                                                        const isFirst = index === 0;
                                                        if (isFirst) {
                                                            if (lpTokenAddress.toLowerCase() !== inputToken.address.toLowerCase()) {
                                                                return <option value={lpTokenAddress}>{pathToken.symbols[lpTokenIndex]}</option>
                                                            }
                                                        } else {
                                                            if (lpTokenAddress.toLowerCase() !== pathTokens[index - 1].outputTokenAddress.toLowerCase()) {
                                                                return <option value={lpTokenAddress}>{pathToken.symbols[lpTokenIndex]}</option>
                                                            }
                                                        }
                                                    })
                                                }
                                            </select>
                                        </div>
                                    </>
                                )
                            })
                        }
                    </>
            }
            {
                transferType ? <>
                    <div className="row">
                        <h6><b>Receiver</b></h6>
                    </div>
                    <div className="row">
                        <div className="input-group mb-3">
                            <input type="text" value={currentReceiver} onChange={(e) => setCurrentReceiver(e.target.value)} className="form-control" placeholder="Address" aria-label="Receiver" aria-describedby="button-add" />
                            <button onClick={() => {
                                const exists = receivers.filter((r) => r.address.toLowerCase() === currentReceiver.toLowerCase()).length > 0;
                                if (exists) return;
                                setReceivers(receivers.concat({ address: currentReceiver, percentage: receivers.length === 0 ? 100 : 0 }));
                                setCurrentReceiver("");
                            }} className="btn btn-outline-secondary ml-2" type="button" id="button-add">Add</button>
                        </div>
                    </div>
                    <div className="row mb-4">
                        {
                            receivers.map((receiver, index) => {
                                return (
                                    <div className="col-12 mb-2">
                                        {
                                            receivers.length === 1 ? <div className="row align-items-center">
                                                <b>{receiver.address}</b>
                                                <button onClick={() => setReceivers(receivers.filter((_, i) => i !== index))} className="btn btn-danger btn-sm ml-2">X</button>
                                            </div> : <div className="row align-items-center">
                                                    <div className="col-md-8 col-12">
                                                        <b>{receiver.address}</b>
                                                    </div>
                                                    <div className="col-md-2 col-12">
                                                        <input type="number" min={0} max={100} onChange={(e) => onPercentageChange(index, e.target.value)} className="form-control mr-1" value={receiver.percentage} />
                                                    </div>
                                                    <div className="col-md-2 col-12">
                                                        <button onClick={() => setReceivers(receivers.filter((_, i) => i !== index))} className="btn btn-danger btn-sm">X</button>
                                                    </div>
                                                </div>
                                        }
                                    </div>
                                )
                            })
                        }
                    </div>
                </> : <div />
            }
        </>
    }

    const getThirdStep = () => {
        return <div className="col-12 flex flex-column align-items-center">
            {actionType === 'transfer' ? getTransferThirdStep() : getSwapThirdStep()}
            <div className="row justify-content-center">
                <button onClick={() => setStep(step - 1)} className="btn btn-light mr-4">Back</button>
                <button onClick={() => props.saveEditOperation(getEntry())} disabled={(!amount && !percentage) || !transferType || receivers.length === 0 || !isValidPercentage()} className="btn btn-secondary">Add</button>
            </div>
        </div>
    }

    const getFourthStep = () => {
        return <div />
    }

    return getStep();
}

const mapStateToProps = (state) => {
    const { core, session } = state;
    const { dfoCore } = core;
    const { inflationSetups } = session;
    return { dfoCore, inflationSetups };
}

const mapDispatchToProps = (dispatch) => {
    return {
        addEntry: (entry, setupIndex) => dispatch(addEntry(entry, setupIndex)),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Operation);