import { useEffect } from 'react';
import { useState } from 'react';
import { connect } from 'react-redux';
import { Coin, Input, TokenInput } from '../../../../components/shared';

const CreateOrEditFarmingSetup = (props) => {
    const { rewardToken, onAddFarmingSetup, editSetup, onEditFarmingSetup, dfoCore, onCancel } = props;
    const selectedFarmingType = editSetup ? (editSetup.free ? "free" : "locked") : props.selectedFarmingType;
    // general purpose
    const [loading, setLoading] = useState(false);
    const [blockDuration, setBlockDuration] = useState((editSetup && editSetup.blockDuration) ? editSetup.blockDuration : 0);
    const [startBlock, setStartBlock] = useState((editSetup && editSetup.startBlock) ? editSetup.startBlock : 0);
    const [hasStartBlock, setHasStartBlock] = useState((editSetup && editSetup.startBlock) ? true : false);
    const [hasMinStakeable, setHasMinStakeable] = useState((editSetup && editSetup.minStakeable) ? editSetup.minStakeable : false);
    const [minStakeable, setMinSteakeable] = useState((editSetup && editSetup.minStakeable) ? editSetup.minStakeable : 0);
    const [isRenewable, setIsRenewable] = useState((editSetup && editSetup.renewTimes) ? editSetup.renewTimes > 0 : false);
    const [renewTimes, setRenewTimes] = useState((editSetup && editSetup.renewTimes) ? editSetup.renewTimes : 0);
    const [involvingEth, setInvolvingEth] = useState((editSetup && editSetup.involvingEth) ? editSetup.involvingEth : false);
    const [ethSelectData, setEthSelectData] = useState((editSetup && editSetup.ethSelectData) ? editSetup.ethSelectData : null);
    const [tickUpper, settickUpper] = useState((editSetup && editSetup.tickUpper) ? editSetup.tickUpper : 0);
    const [tickLower, settickLower] = useState((editSetup && editSetup.tickLower) ? editSetup.tickLower : 0);
    // token state
    const [liquidityPoolToken, setLiquidityPoolToken] = useState((editSetup && editSetup.data) ? editSetup.data : null);
    const [mainTokenIndex, setMainTokenIndex] = useState((editSetup && editSetup.mainTokenIndex) ? editSetup.mainTokenIndex : 0);
    const [mainToken, setMainToken] = useState((editSetup && editSetup.mainToken) ? editSetup.mainToken : null);
    const [rewardPerBlock, setRewardPerBlock] = useState((editSetup && editSetup.rewardPerBlock) ? editSetup.rewardPerBlock : 0);
    const [maxStakeable, setMaxStakeable] = useState((editSetup && editSetup.maxStakeable) ? editSetup.maxStakeable : 0);
    const [hasPenaltyFee, setHasPenaltyFee] = useState((editSetup && editSetup.penaltyFee) ? editSetup.penaltyFee > 0 : false);
    const [penaltyFee, setPenaltyFee] = useState((editSetup && editSetup.penaltyFee) ? editSetup.penaltyFee : 0);
    const [ethAddress, setEthAddress] = useState((editSetup && editSetup.ethAddress) ? editSetup.ethAddress : "");
    // current step
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (editSetup && (editSetup.liquidityPoolTokenAddress || (editSetup.liquidityPoolToken && editSetup.liquidityPoolToken.address))) {
            onSelectLiquidityPoolToken(editSetup.liquidityPoolTokenAddress || editSetup.liquidityPoolToken.address).then(() => editSetup.mainToken && setMainToken(editSetup.mainToken));
        }
    }, []);

    const onSelectLiquidityPoolToken = async (address) => {
        if (!address) return;
        setLoading(true);
        try {
            const poolContract = await dfoCore.getContract(dfoCore.getContextElement("UniswapV3PoolABI"), address);
            const lpInfo = [
                [], [], [
                    await poolContract.methods.token0().call(),
                    await poolContract.methods.token1().call()
                ]
            ];
            const ammData = [
                await (await dfoCore.getContract(dfoCore.getContextElement("UniswapV3NonfungiblePositionManagerABI"), dfoCore.getContextElement('uniswapV3NonfungiblePositionManagerAddress'))).methods.WETH9().call()
            ];
            const tokens = [];
            let ethTokenFound = false;
            setInvolvingEth(false);
            await Promise.all(lpInfo[2].map(async (tkAddress) => {
                if (tkAddress.toLowerCase() === ammData[0].toLowerCase()) {
                    setInvolvingEth(true);
                    ethTokenFound = true;
                    setEthAddress(ammData[0]);
                    if (ammData[0] === dfoCore.voidEthereumAddress) {
                        setEthSelectData(null);
                    } else {
                        const notEthToken = await dfoCore.getContract(dfoCore.getContextElement('ERC20ABI'), ammData[0]);
                        const notEthTokenSymbol = await notEthToken.methods.symbol().call();
                        setEthSelectData({ symbol: notEthTokenSymbol })
                    }
                }
                const currentToken = await dfoCore.getContract(dfoCore.getContextElement('ERC20ABI'), tkAddress);
                const symbol = tkAddress === window.voidEthereumAddress ? "ETH" : await currentToken.methods.symbol().call();
                tokens.push({ symbol, address: tkAddress, isEth: tkAddress.toLowerCase() === ammData[0].toLowerCase() })
            }));
            if (!ethTokenFound) setEthSelectData(null);
            setLiquidityPoolToken({
                address,
                name: 'Uniswap V3',
                tokens
            });
            setMainToken(tokens[0]);
        } catch (error) {
            setInvolvingEth(false);
            setEthSelectData(null);
            setLiquidityPoolToken(null);
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const onUpdateHasMinStakeable = (value) => {
        setHasMinStakeable(value);
        setMinSteakeable(0);
    }

    const onUpdateHasPenaltyFee = (value) => {
        setHasPenaltyFee(value);
        setPenaltyFee(0)
    }

    const onUpdatePenaltyFee = (value) => {
        setPenaltyFee(value > 100 ? 100 : value);
    }

    const onFreeRewardPerBlockUpdate = (value) => {
        const parsedValue = dfoCore.fromDecimals(value, rewardToken.decimals);
        setRewardPerBlock(parsedValue < 1 ? 0 : value);
    }

    const addSetup = () => {
        if (hasMinStakeable && window.formatNumber(minStakeable) <= 0) {
            return;
        }
        if (isRenewable && window.formatNumber(renewTimes) <= 0) {
            return;
        }
        const setup = {
            free: selectedFarmingType === 'free',
            blockDuration,
            startBlock,
            minStakeable,
            renewTimes,
            involvingEth,
            ethSelectData,
            liquidityPoolToken,
            mainTokenIndex,
            mainToken,
            rewardPerBlock,
            maxStakeable,
            penaltyFee,
            ethAddress,
            tickLower,
            tickUpper
        };
        editSetup ? onEditFarmingSetup(setup, props.editSetupIndex) : onAddFarmingSetup(setup);
    }

    function next() {
        if (selectedFarmingType === 'locked' && window.formatNumber(maxStakeable) <= 0) {
            return;
        }
        currentStep === 0 && liquidityPoolToken && window.formatNumber(blockDuration) > 0 && window.formatNumber(rewardPerBlock) > 0 && setCurrentStep(1);
        currentStep === 1 && tickUpper !== tickLower && tickLower < tickUpper && setCurrentStep(2);
    }

    const getFirstStep = () => {
        return <div className="CheckboxQuestions">
            <p className="BreefRecapB">Load the Pool you want to reward for this setup by its Ethereum address.</p>
            <TokenInput placeholder={"Liquidity pool address"} tokenAddress={(editSetup && (editSetup.liquidityPoolTokenAddress || (editSetup.liquidityPoolToken && editSetup.liquidityPoolToken.address))) || ""} onClick={onSelectLiquidityPoolToken} text={"Load"} />
            {
                loading ? <div className="row justify-content-center">
                    <div className="spinner-border text-secondary" role="status">
                        <span className="visually-hidden"></span>
                    </div>
                </div> : <>
                    <div className="CheckboxQuestions">
                        {(liquidityPoolToken && liquidityPoolToken.tokens.length > 0) &&
                            <h6 className="TokenSelectedB uuuuTokenLoad"><b>{liquidityPoolToken.name} | {liquidityPoolToken.tokens.map((token) => <>{!token.isEth ? token.symbol : involvingEth ? 'ETH' : token.symbol} </>)}</b> {liquidityPoolToken.tokens.map((token) => <Coin address={!token.isEth ? token.address : involvingEth ? props.dfoCore.voidEthereumAddress : token.address} />)}</h6>
                        }
                    </div>
                    {
                        liquidityPoolToken && <>
                            {
                                false && ethSelectData &&
                                <div className="form-check HIDEO">
                                    <input className="form-check-input" type="checkbox" checked={involvingEth} onChange={(e) => setInvolvingEth(e.target.checked)} id="involvingEth" />
                                    <label className="form-check-label" htmlFor="involvingEth">
                                        Use {ethSelectData.symbol} as ETH
                                    </label>
                                </div>
                            }
                            {
                                selectedFarmingType === 'locked' && <>
                                    <select className="SelectRegular" value={mainTokenIndex} onChange={(e) => { setMainTokenIndex(e.target.value); setMainToken(liquidityPoolToken.tokens[e.target.value]); }}>
                                        {
                                            liquidityPoolToken.tokens.map((tk, index) => {
                                                return <option key={tk.address} value={index}>{!tk.isEth ? tk.symbol : involvingEth ? 'ETH' : tk.symbol}</option>
                                            })
                                        }
                                    </select>
                                    <div className="InputTokensRegular">
                                        <h6>Max stakeable</h6>
                                        <p className="BreefRecapB">The maximum amount of main tokens staked simultaneously.</p>
                                        <div className="InputTokenRegular">
                                            <Input min={0} showCoin={true} address={(mainToken.isEth && involvingEth) ? props.dfoCore.voidEthereumAddress : mainToken.address} value={maxStakeable} name={(mainToken.isEth && involvingEth) ? 'ETH' : mainToken.symbol} onChange={(e) => setMaxStakeable(e.target.value)} />
                                        </div>
                                    </div>
                                </>
                            }
                            <div className="InputTokensRegular">
                                <h6>Reward per block</h6>
                                <p className="BreefRecapB">Select the duration of the setup. The selected timeband will determine the end block once the setup begins.</p>
                                <div className="InputTokenRegular">
                                    <Input min={0} showCoin={true} address={rewardToken.address} value={rewardPerBlock} name={rewardToken.symbol} onChange={(e) => onFreeRewardPerBlockUpdate(e.target.value)} />
                                </div>
                            </div>
                            <p className="BreefRecapB">Select the duration of the setup. The selected timeband will determinate the end block once activated</p>
                            <select className="SelectRegular" value={blockDuration} onChange={(e) => setBlockDuration(e.target.value)}>
                                <option value={0}>Choose setup duration</option>
                                {
                                    Object.keys(props.dfoCore.getContextElement("blockIntervals")).map((key, index) => {
                                        return <option key={key} value={props.dfoCore.getContextElement("blockIntervals")[key]}>{key}</option>
                                    })
                                }
                            </select>
                            <p className="BreefRecapB"><b>Total reward ({`${blockDuration}`} blocks): {rewardPerBlock * blockDuration} {rewardToken.symbol}</b></p>
                        </>
                    }
                    <div className="Web2ActionsBTNs">
                        <a onClick={onCancel} className="backActionBTN">Back</a>
                        <a onClick={next} className="web2ActionBTN">Next</a>
                    </div>
                </>
            }
        </div>
    }

    const choosetick = () => {
        return (
            <div>
                <div className="InputTokensRegular">
                    <h6>Min Tick</h6>
                    <p className="BreefRecapB">Set the Lower Tick</p>
                    <div className="InputTokenRegular">
                        <input type="number" value={tickLower} onChange={e => settickLower(parseInt(e.currentTarget.value))}/>
                    </div>
                </div>
                <div className="InputTokensRegular">
                    <h6>Max Tick</h6>
                    <p className="BreefRecapB">Set the Upper Tick</p>
                    <div className="InputTokenRegular">
                        <input type="number" value={tickUpper} onChange={e => settickUpper(parseInt(e.currentTarget.value))}/>
                    </div>
                </div>
                <div className="Web2ActionsBTNs">
                    <a onClick={() => setCurrentStep(0)} className="backActionBTN">Back</a>
                    <a onClick={next} className="web2ActionBTN">Next</a>
                </div>
            </div>
        );
    };

    const getSecondStep = () => {
        return (
            <div className="CheckboxQuestions">
                <h6><input type="checkbox" checked={hasStartBlock} onChange={(e) => {
                    setStartBlock(0);
                    setHasStartBlock(e.target.checked);
                }} /> Start Block</h6>
                {
                    hasStartBlock && <div className="InputTokensRegular InputRegularB">
                        <Input min={0} value={startBlock} onChange={(e) => setStartBlock(e.target.value)} />
                    </div>
                }
                <p className="BreefRecapB">[Optional <b>&#128171; Recommended</b>] Set a start block for this setup. Farmers will be able to activate it after that. This feature helps by giving the host the time needed to send reward tokens to the contract or vote via a DFO/DAO for more complex functionalities. more info in the <a target="_blank" href="https://docs.ethos.wiki/covenants/protocols/farm/manage-farming-setups/activate-disactivate-farming-setup">Grimoire</a></p>
                <h6><input type="checkbox" checked={hasMinStakeable} onChange={(e) => onUpdateHasMinStakeable(e.target.checked)} id="minStakeable" /> Min stakeable</h6>
                {
                    hasMinStakeable && <div className="InputTokensRegular">
                        <div className="InputTokenRegular">
                            <Input min={0} showCoin={true} address={(!mainToken?.isEth && !liquidityPoolToken.tokens[mainTokenIndex].isEth) ? `${mainToken?.address || liquidityPoolToken.tokens[mainTokenIndex].address}` : involvingEth ? props.dfoCore.voidEthereumAddress : `${mainToken?.address || liquidityPoolToken.tokens[mainTokenIndex].address}`} value={minStakeable} name={(!mainToken?.isEth && !liquidityPoolToken.tokens[mainTokenIndex].isEth) ? `${mainToken?.symbol || liquidityPoolToken.tokens[mainTokenIndex].symbol}` : involvingEth ? 'ETH' : `${mainToken?.symbol || liquidityPoolToken.tokens[mainTokenIndex].symbol}`} onChange={(e) => setMinSteakeable(e.target.value)} />
                        </div>
                        {
                            selectedFarmingType === 'free' && <>
                                <h6>Main Token</h6>
                                <select className="SelectRegular" value={mainTokenIndex} onChange={(e) => { setMainTokenIndex(e.target.value); setMainToken(liquidityPoolToken.tokens[e.target.value]); }}>
                                    {
                                        liquidityPoolToken.tokens.map((tk, index) => {
                                            return <option key={tk.address} value={index}>{!tk.isEth ? tk.symbol : involvingEth ? 'ETH' : tk.symbol}</option>
                                        })
                                    }
                                </select>
                                <br></br>
                            </>
                        }
                    </div>
                }
                <p className="BreefRecapB">[Optional] You can set a floor for the minimum amount of main tokens required to stake a position.</p>
                {
                    selectedFarmingType === 'locked' && <>
                        <h6><input type="checkbox" checked={hasPenaltyFee} onChange={(e) => onUpdateHasPenaltyFee(e.target.checked)} id="penaltyFee" /> Penalty fee </h6>
                        {
                            hasPenaltyFee && <>
                                <div className="SpecialInputPerch">
                                    <aside>%</aside>
                                    <input placeholder="Penalty Fee" type="number" min={0} max={100} value={penaltyFee} onChange={(e) => onUpdatePenaltyFee(e.target.value)} className="TextRegular" />
                                </div>
                                <p className="BreefRecapB">Main Token: {rewardToken.symbol}</p>
                            </>
                        }
                        <p className="BreefRecapB">[Optional] You can set a penalty fee as a percentage of the total rewards for a locked position that must be paid to close it before the end block.</p>
                    </>
                }
                <h6><input type="checkbox" checked={isRenewable} onChange={(e) => {
                    setRenewTimes(0);
                    setIsRenewable(e.target.checked);
                }} id="repeat" /> Repeat</h6>
                {
                    isRenewable && <div className="InputTokensRegular InputRegularB">
                        <Input min={0} value={renewTimes} onChange={(e) => setRenewTimes(e.target.value)} />
                    </div>
                }
                <p className="BreefRecapB">[Optional] You can customize a setup to automatically repeat itself after the end block.</p>
                <div className="Web2ActionsBTNs">
                    <a onClick={() => setCurrentStep(1)} className="backActionBTN">Back</a>
                    <a onClick={() => addSetup()} className="web2ActionBTN">{editSetup ? 'Edit' : 'Add'}</a>
                </div>
            </div>
        )
    }

    var steps = [
        getFirstStep,
        choosetick,
        getSecondStep
    ];

    return steps[currentStep || 0]();
}


const mapStateToProps = (state) => {
    const { core } = state;
    return { dfoCore: core.dfoCore };
}

export default connect(mapStateToProps)(CreateOrEditFarmingSetup);