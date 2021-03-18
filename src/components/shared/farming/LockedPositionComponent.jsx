import { useState } from "react";
import ApproveButton from "../buttons/ApproveButton";

const LockedPositionComponent = (props) => {
    const { 
        position, 
        dfoCore, 
        blockNumber, 
        setup, 
        setupInfo, 
        mainTokenInfo, 
        onRewardTokenApproval, 
        setupTokens, 
        rewardTokenInfo, 
        lockedPositionReward, 
        lockedPositionStatus, 
        lpTokenInfo, 
        lmContract, 
        onComplete,
        farmTokenSymbol,
        farmTokenDecimals,
    } = props;
    // booleans
    const [showTransfer, setShowTransfer] = useState(false);
    const [showUnlock, setShowUnlock] = useState(false);
    const [unlockLoading, setUnlockLoading] = useState(false);
    const [transferLoading, setTransferLoading] = useState(false);
    const [claimLoading, setClaimLoading] = useState(false);
    const [transferAddress, setTransferAddress] = useState("");

    let mainTokenIndex = 0;
    
    setupTokens.forEach((token, i) => {
        if (token.address === setupInfo.mainTokenAddress) {
            mainTokenIndex = i;
        }
    });

    const transferPosition = async () => {
        if (!transferAddress) return;
        setTransferLoading(false);
        try {
            const gasLimit = await lmContract.methods.transferPosition(transferAddress, position.positionId).estimateGas({ from: dfoCore.address });
            const result = await lmContract.methods.transferPosition(transferAddress, position.positionId).send({ from: dfoCore.address, gasLimit });
            onComplete(result);
        } catch (error) {
            console.error(error);
        } finally {
            setTransferLoading(false);
        }

    }

    const unlockPosition = async () => {
        setUnlockLoading(true);
        try {
            const gasLimit = await lmContract.methods.unlock(position.positionId, false).estimateGas({ from: dfoCore.address });
            const result = await lmContract.methods.unlock(position.positionId, false).send({ from: dfoCore.address, gasLimit });
            onComplete(result);
        } catch (error) {
            console.error(error);
        } finally {
            setUnlockLoading(false);
        }
    }

    const withdrawReward = async () => {
        setClaimLoading(true);
        try {
            const gasLimit = await lmContract.methods.withdrawReward(position.positionId).estimateGas({ from: dfoCore.address });
            const result = await lmContract.methods.withdrawReward(position.positionId).send({ from: dfoCore.address, gasLimit });
            onComplete(result);
        } catch (error) {
            console.error(error);
        } finally {
            setClaimLoading(false);
        }
    }

    return (
        <div className="LockedFarmPositions">
            <div className="FarmYou">
                <p><b>Position Weight</b>: {window.formatMoney(window.fromDecimals(position.mainTokenAmount, mainTokenInfo.decimals, true), 6)} {mainTokenInfo.symbol}</p>
                {
                    (parseInt(blockNumber) < parseInt(setup.endBlock) && !showUnlock) && <a onClick={() => setShowUnlock(true)} className="web2ActionBTN">Unlock</a>
                }
                {
                    showUnlock && <a onClick={() => setShowUnlock(false)} className="backActionBTN">Close</a>
                }
                {
                    showUnlock && <div>
                        <p><b>Give back</b>: {window.formatMoney(window.fromDecimals((parseFloat(parseInt(position.reward) * (parseInt(setupInfo.penaltyFee) / 1e18)) + parseInt(lockedPositionStatus.partiallyRedeemed)), rewardTokenInfo.decimals, true), 6)} {rewardTokenInfo.symbol} - {window.formatMoney(dfoCore.toDecimals(dfoCore.toFixed(position.liquidityPoolTokenAmount), lpTokenInfo.decimals), lpTokenInfo.decimals)} {/* farmTokenSymbol */"fLP"}</p>
                        <p><b>Balance</b>: {window.formatMoney(window.fromDecimals(rewardTokenInfo.balance, rewardTokenInfo.decimals, true), 6)} {rewardTokenInfo.symbol}</p>
                        <p><b>LP tokens unlocked</b>: {window.formatMoney(window.fromDecimals(position.liquidityPoolTokenAmount, lpTokenInfo.decimals, true), 6)} {lpTokenInfo.symbol}</p>
                        {
                            !rewardTokenInfo.approval ? <ApproveButton contract={rewardTokenInfo.contract} from={dfoCore.address} spender={lmContract.options.address} onApproval={() => onRewardTokenApproval()} onError={(error) => console.error(error)} text={`Approve ${rewardTokenInfo.symbol}`} /> : 
                                unlockLoading ? <a className="Web3ActionBTN" disabled={unlockLoading}>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                </a> : parseInt(blockNumber) < parseInt(setup.endBlock) ? <a onClick={() => unlockPosition()} className="Web3ActionBTN">Unlock</a> : <></>
                        }
                    </div>
                }
            </div>
            <div className="Farmed">
                <p><b>Reward</b>: {window.formatMoney(dfoCore.toDecimals(dfoCore.toFixed(position.reward), rewardTokenInfo.decimals), rewardTokenInfo.decimals)} {rewardTokenInfo.symbol}</p>
                <p><b>Unclaimed</b>: {window.formatMoney(dfoCore.toDecimals(dfoCore.toFixed(lockedPositionReward), rewardTokenInfo.decimals), rewardTokenInfo.decimals)} {rewardTokenInfo.symbol}</p>
                {
                    !showTransfer ? <a onClick={() => setShowTransfer(true)} className="web2ActionBTN">Transfer</a> : <a onClick={() => setShowTransfer(false)} className="backActionBTN">Close</a>
                }
                {
                    claimLoading ? <a className="web2ActionBTN" disabled={claimLoading}>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    </a> : <a onClick={() => withdrawReward()} className="Web3ActionBTN">Claim</a>
                }
                {
                    showTransfer && <div className="Tranferpos">
                        <input type="text" className="TextRegular" placeholder="Position receiver" value={transferAddress} onChange={(e) => setTransferAddress(e.target.value)} id="transferAddress" />
                        {
                            transferLoading ? <a className="Web3ActionBTN" disabled={transferLoading}>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            </a> : <a onClick={() => transferPosition()} className="Web3ActionBTN">Transfer</a>
                        }
                    </div>
                }
            </div>
        </div>
    )
}

export default LockedPositionComponent;