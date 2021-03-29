import { useState } from 'react';
import { connect } from 'react-redux';
import CreateOrEditFarmingSetup from './CreateOrEditFarmingSetup';

const CreateOrEditFarmingSetups = (props) => {
    const { rewardToken, farmingSetups, onAddFarmingSetup, onEditFarmingSetup, onRemoveFarmingSetup, onCancel, onFinish } = props;
    const [isAdd, setIsAdd] = useState(false);
    const [editSetup, setEditSetup] = useState(null);
    const [editSetupIndex, setEditSetupIndex] = useState(0);
    const [selectedFarmingType, setSelectedFarmingType] = useState("");
    const [currentStep, setCurrentStep] = useState(0);

    if (currentStep > 0 || editSetup) {
        return (
            <CreateOrEditFarmingSetup 
                rewardToken={rewardToken} 
                onAddFarmingSetup={(setup) => { onAddFarmingSetup(setup); setCurrentStep(0); setIsAdd(false); }} 
                editSetup={editSetup} 
                editSetupIndex={editSetupIndex}
                onEditFarmingSetup={(setup, index) => { onEditFarmingSetup(setup, index); setEditSetup(null); setEditSetupIndex(0); setCurrentStep(0); }}
                selectedFarmingType={editSetup ? !editSetup.maxLiquidity ? "free" : "locked" : selectedFarmingType} 
                onCancel={() => { setCurrentStep(0); setEditSetup(null); setEditSetupIndex(0); }} 
            />
        )
    }

    if (farmingSetups.length === 0 || isAdd) {
        return (
            <div className="CheckboxQuestions">
                    <h6><b>Create Setup by</b></h6>
                <div className="Web2ActionsBTNs">
                    <a onClick={() => setSelectedFarmingType(selectedFarmingType !== 'free' ? 'free' : null)} className={`${selectedFarmingType === 'free' ? "web2ActionBTN" : "backActionBTN"} mr-4`}>Free</a>
                    <a onClick={() => setSelectedFarmingType(selectedFarmingType !== 'locked' ? 'locked' : null)} className={`${selectedFarmingType === 'locked' ? "web2ActionBTN" : "backActionBTN"}`}>Locked</a>
                </div>
                <p className="BreefRecapB">Farming setups can be either Free or Locked. In free farming, Farmers can stake / un-stake liquidity anytime, but the reward/block is shared btween them. In Locked setups Farmers lock the liquidity until it ends, but reawards are fixed.</p>
                <div className="Web2ActionsBTNs">
                    <a className="backActionBTN" onClick={onCancel}>Back</a>
                    <a onClick={() => selectedFarmingType && setCurrentStep(1)} disabled={!selectedFarmingType} className="web2ActionBTN ml-2">Next</a>
                </div>
                <br></br>
                {farmingSetups.length === 0 && !props.forEdit && <div className="Web2ActionsBTNs">
                    <a className="hiddenLink" onClick={onFinish}>Deploy without setups</a>
                </div>}
            </div>
        );
    }

    return (
        <div className="col-12 p-0">
            {
                farmingSetups.map((setup, i) => {
                    return (
                        <div key={i} className="SetupListITEM">
                            <div className="SetupListITEMINFO">
                                <b style={{fontSize: 14}}>{ setup.free ? "Free setup" : "Locked setup" } { setup.liquidityPoolToken.name }{ !setup.free ? `${(setup.mainToken.isEth && setup.involvingEth) ? 'ETH' : setup.liquidityPoolToken.symbol}` : ` | ${setup.liquidityPoolToken.tokens.map((token) => `${(setup.involvingEth && token.address.toLowerCase() === setup.ethAddress.toLowerCase()) ? 'ETH' : token.symbol}` )}` } - Reward: {setup.rewardPerBlock} {rewardToken.symbol}/block</b>
                            </div>
                            <div className="SetupListITEMACTIONS">
                                <a className="btn btn-sm btn-outline-danger mr-1" onClick={() => onRemoveFarmingSetup(i)}><b>X</b></a> <a onClick={() => { setEditSetup(setup); setEditSetupIndex(i); }} className="web2ActionBTN ml-1"><b>EDIT</b></a>
                            </div>
                        </div>
                    )
                })
            }
            <div className="row justify-content-between mt-4">
                <div className="col-12 flex justify-content-start mb-4">
                    <a onClick={() => setIsAdd(true)} className="web2ActionBTN">Add setup</a>
                </div>
                <div className="Web2ActionsBTNs">
                    <a onClick={() => {
                        farmingSetups.forEach((_, index) => onRemoveFarmingSetup(index));
                        onCancel();
                    }} className="backActionBTN mr-4">Back</a> {props.finishButton || <a onClick={() => onFinish()} className="web2ActionBTN ml-4">Next</a>}
                </div>
            </div>
        </div>
    )
}


const mapStateToProps = (state) => {
    const { core } = state;
    return { dfoCore: core.dfoCore };
}

export default connect(mapStateToProps)(CreateOrEditFarmingSetups);