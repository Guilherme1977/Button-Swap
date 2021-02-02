import { connect } from 'react-redux';
import DFOCore from '../../../core';
import { setDFOCore, removeDFOCore } from '../../../store/actions';
import { default as context } from '../../../data/context.json';
import { useState } from 'react';
import { DappMenu } from '../../../components';
import { Explore } from './components';

const Dapp = (props) => {

    const [currentTab, setCurrentTab] = useState('explore');

    const connectCore = async () => {
        const core = new DFOCore(context);
        await core.init();
        props.setCore(core);
    }

    const getContent = () => {
        switch (currentTab) {
            case 'explore':
                return <Explore />;
            case 'create':
                return <div />;
            default:
                return <div/>;
        }
    }

    if (!props.dfoCore) {
        return (
            <div className="container bg-white dapp-container">
                <div className="row">
                    <div className="col-12 dapp-col text-center justify-content-center">
                        <button className="btn btn-primary mx-4" onClick={() => connectCore()}>Connect</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="container bg-white dapp-container">
            <div className="row" style={{flexDirection: 'column'}}>
                <div className="col-12 dapp-col text-center">
                    <DappMenu className="wusd-dapp-menu" onClick={(name) => setCurrentTab(name)} currentTab={currentTab} options={['Explore', 'Create']} />
                    <div className="wusd-dapp-content mt-4">
                        { getContent() }
                    </div>
                </div>
            </div>
        </div>
    )
}

const mapStateToProps = (state) => {
    const { core } = state;
    return { dfoCore: core.dfoCore };
}

const mapDispatchToProps = (dispatch) => {
    return {
        setCore: (dfoCore) => dispatch(setDFOCore(dfoCore)),
        removeCore: () => dispatch(removeDFOCore()),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Dapp);