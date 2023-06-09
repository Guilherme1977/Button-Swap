import { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { FarmingComponent } from '../../../../components';

const Hosted = (props) => {
    const { dfoCore } = props;
    const [tokenFilter, setTokenFilter] = useState("");
    const [farmingContracts, setFarmingContracts] = useState([]);
    const [startingContracts, setStartingContracts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (dfoCore) {
            getContracts();
        }
    }, [])

    const getContracts = async () => {
        setLoading(true);
        try {
            const hostedContracts = await dfoCore.getHostedFarmingContracts();
            const mappedContracts = await Promise.all(
                hostedContracts.map(async (c) => {
                    try {
                        const contract = await dfoCore.getContract(dfoCore.getContextElement(c.generation === 'gen2' ? "FarmMainGen2ABI" : 'FarmMainGen1ABI'), c.address)
                        const rewardTokenAddress = await contract.methods._rewardTokenAddress().call();
                        const rewardToken = await dfoCore.getContract(dfoCore.getContextElement('ERC20ABI'), rewardTokenAddress);
                        const symbol = await rewardToken.methods.symbol().call();
                        const decimals = await rewardToken.methods.decimals().call();
                        const extensionAddress = await contract.methods.host().call();
                        const extensionContract = await dfoCore.getContract(dfoCore.getContextElement(c.generation === 'gen2' ? "FarmExtensionGen2ABI" : 'FarmExtensionGen1ABI'), extensionAddress);
                        const { host, byMint } = await extensionContract.methods.data().call();
                        const blockNumber = await dfoCore.getBlockNumber();
                        const setups = await contract.methods.setups().call();
                        const freeSetups = [];
                        const lockedSetups = [];
                        let totalFreeSetups = 0;
                        let totalLockedSetups = 0;

                        let rewardPerBlock = 0;
                        let canActivateSetup = false;
                        await Promise.all(setups.map(async (setup, i) => {
                            const { '0': s, '1': setupInfo } = await props.dfoCore.loadFarmingSetup(contract, i);
                            if (!canActivateSetup) {
                                canActivateSetup = parseInt(setupInfo.renewTimes) > 0 && !setup.active && parseInt(setupInfo.lastSetupIndex) === parseInt(i);
                            }
                            if (setup.active && (parseInt(setup.endBlock) > blockNumber)) {
                                setupInfo.free ? freeSetups.push(setup) : lockedSetups.push(setup);
                                rewardPerBlock += parseInt(setup.rewardPerBlock);
                            }
                            if (setup.rewardPerBlock !== "0") {
                                setupInfo.free ? totalFreeSetups += 1 : totalLockedSetups += 1;
                            }
                        }))

                        const metadata = {
                            name: `Farm ${symbol}`,
                            contractAddress: contract.options.address,
                            rewardTokenAddress: rewardToken.options.address,
                            rewardPerBlock: dfoCore.toDecimals(dfoCore.toFixed(rewardPerBlock).toString(), decimals),
                            byMint,
                            freeSetups,
                            lockedSetups,
                            totalFreeSetups,
                            totalLockedSetups,
                            canActivateSetup,
                            extension: `${extensionAddress.substring(0, 5)}...${extensionAddress.substring(extensionAddress.length - 3, extensionAddress.length)}`,
                            fullExtension: `${extensionAddress}`,
                            farmAddress: `${contract.options.address.substring(0, 5)}...${contract.options.address.substring(contract.options.address.length - 3, contract.options.address.length)}`,
                            host: `${host.substring(0, 5)}...${host.substring(host.length - 3, host.length)}`,
                            fullhost: `${host}`,
                            generation : c.generation
                        };
                        return { contract, metadata, isActive: freeSetups.length + lockedSetups.length > 0 || canActivateSetup };
                    } catch (error) {
                        console.error(error);
                    }
                })
            );
            setFarmingContracts(mappedContracts.filter((c) => c).sort((a, b) => (a.isActive === b.isActive) ? 0 : a.isActive ? -1 : 1));
            setStartingContracts(mappedContracts.filter((c) => c).sort((a, b) => (a.isActive === b.isActive) ? 0 : a.isActive ? -1 : 1));
        } catch (error) {
            console.error(error);
            setFarmingContracts([]);
            setStartingContracts([]);
        } finally {
            setLoading(false);
        }
    }

    const onChangeTokenFilter = async (value) => {
        if (!value) {
            setTokenFilter("");
            setFarmingContracts(startingContracts);
            return;
        }
        setLoading(true);
        try {
            setTokenFilter(value);
            const filteredFarmingContracts = [];
            await Promise.all(startingContracts.map(async (contract) => {
                const rewardTokenAddress = await contract.methods._rewardTokenAddress().call();
                if (rewardTokenAddress.toLowerCase().includes(value.toLowerCase())) {
                    filteredFarmingContracts.push(contract);
                }
            }));
            setFarmingContracts(filteredFarmingContracts);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="MainExploration">
            {
                loading ?
                    <div className="row mt-4">
                        <div className="col-12 justify-content-center">
                            <div className="spinner-border text-secondary" role="status">
                                <span className="visually-hidden"></span>
                            </div>
                        </div>
                    </div> : <div className="ListOfThings">
                        {
                            farmingContracts.length === 0 && <div className="col-12 text-left">
                                <h6><b>You're not hosting any contract</b></h6>
                            </div>
                        }
                        {
                            farmingContracts.length > 0 && farmingContracts.map((farmingContract) => {
                                return (
                                    <FarmingComponent key={farmingContract.contract.options.address} className="FarmContract" dfoCore={dfoCore} metadata={farmingContract.metadata} hostedBy={true} hasBorder />
                                )
                            })
                        }
                    </div>
            }
        </div>
    )
}

const mapStateToProps = (state) => {
    const { core } = state;
    return { dfoCore: core.dfoCore };
}

export default connect(mapStateToProps)(Hosted);