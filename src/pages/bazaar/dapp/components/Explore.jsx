import { useState } from 'react';
import { useEffect } from 'react';
import { connect } from 'react-redux';
import { BazaarComponent } from '../../../../components';
import Create from './Create';
import axios from 'axios';

const Explore = (props) => {
    const [showCreate, setShowCreate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [indexTokens, setIndexTokens] = useState([]);
    const [showFinish, setShowFinish] = useState(false);
    const [deployedAddress, setDeployedAddress] = useState(props.dfoCore.voidEthereumAddress);

    useEffect(() => {
        getIndexTokens();
    }, []);

    const getIndexTokens = async () => {
        setLoading(true);
        try {
            await props.dfoCore.loadIndexTokens();
            const indexContract = await props.dfoCore.getContract(props.dfoCore.getContextElement('IndexABI'), props.dfoCore.getContextElement('indexAddress'));
            const tokens = [];
            await Promise.all(props.dfoCore.indexTokens.map(async (indexToken) => {
                try {
                    const interoperableContract = await props.dfoCore.getContract(props.dfoCore.getContextElement('IEthItemInteroperableInterfaceABI'), indexToken.address);
                    const mainInterface = await interoperableContract.methods.mainInterface().call();
                    const contract = await props.dfoCore.getContract(props.dfoCore.getContextElement('IEthItemABI'), mainInterface);
                    const info = await indexContract.methods.info(indexToken.objectId, 0).call();
                    var name = await contract.methods.name(indexToken.objectId).call();
                    const uri = await contract.methods.uri(indexToken.objectId).call();
                    const totalSupply = await interoperableContract.methods.totalSupply().call();
                    let res = { data: { description: '', image: '' } };
                    if(window.context.pandorasBox.indexOf(props.dfoCore.web3.utils.toChecksumAddress(indexToken.address)) === -1) {
                        try {
                            res = await axios.get(uri);
                        } catch (error) {
                            console.log('error while reading metadata from ipfs..')
                        }
                    } else {
                        name = "Item";
                    }
                    let total = 0;
                    const amounts = {};
                    await Promise.all(info._tokens.map(async (token, index) => {
                        const amount = info._amounts[index];
                        const tokenContract = await props.dfoCore.getContract(props.dfoCore.getContextElement('ERC20ABI'), token);
                        const decimals = await tokenContract.methods.decimals().call();
                        total += window.formatNumber(amounts[token] = window.fromDecimals(amount, decimals, true));
                    }));
                    total = window.formatNumber(window.toDecimals(total, 18));
                    const percentages = {};
                    info._tokens.forEach(token => percentages[token] = (window.formatNumber(window.toDecimals(amounts[token], 18)) / total) * 100);
                    tokens.push({ totalSupply, contract, amounts, ipfsInfo: res.data, address: indexToken.address, objectId: indexToken.objectId, info, percentages, name, uri });
                } catch (error) {
                    console.error(error);
                }
            }));
            setIndexTokens(tokens.sort(function(a, b){return parseInt(b.totalSupply) - parseInt(a.totalSupply)}));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (showCreate) {
        return <Create onCancel={() => setShowCreate(false) } onFinish={(address) => { setShowCreate(false); setDeployedAddress(address); setShowFinish(true) }}  />
    }

    if (showFinish) {
        return <>
            <div className="row">
                <div className="col-12">
                    <h6>Success!</h6>
                </div>
            </div>
            <div className="row">
                <div className="col-12">
                    <a target="_blank" href={`${props.dfoCore.getContextElement("etherscanURL")}/address/${deployedAddress}`}>{deployedAddress}</a>
                </div>
            </div>
        </>
    }

    if (loading) {
        return (
            <div className="explore-component">
                <div className="row justify-content-center">
                    <div className="spinner-border text-secondary" role="status">
                        <span className="visually-hidden"></span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="MainExploration">
            <div className="ExploreCreate">
                <a onClick={() => { setShowCreate(true); }} className="web2ActionBTN">Create</a>
            </div>
            <div className="ListOfThings">
                {
                    indexTokens.length === 0 && 
                        <h6><b>No Indexes available!</b></h6>

                }
                {
                    indexTokens.length > 0 && indexTokens.map((indexToken, index) => {
                        return (
                            <BazaarComponent key={index} className="IndexContract" dfoCore={props.dfoCore} indexToken={indexToken} hasBorder />
                        )
                    })
                }
            </div>
        </div>
    )
}

const mapStateToProps = (state) => {
    const { core } = state;
    return { dfoCore: core.dfoCore };
}

export default connect(mapStateToProps)(Explore);