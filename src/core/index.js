import Web3 from "web3";
import Web3Modal from "web3modal";
import {ethers} from "ethers";

const abi = new ethers.utils.AbiCoder();

export default class DFOCore {
    address = '0x0000000000000000000000000000000000000000';
    chainId;
    context;
    contracts = {};
    deployedFixedInflationContracts = [];
    deployedFarmingContracts = [];
    indexTokens = [];
    ipfsClient;
    eventEmitters = {};
    initialized = false;
    positions = [];
    provider;
    voidEthereumAddress = '0x0000000000000000000000000000000000000000';
    web3;
    itemsTokens;
    MAX_UINT128 = ethers.BigNumber.from(2).pow(128).sub(1);

    /**
     * constructs the DFOCore object by passing the context json object.
     * @param {*} context app context.
     */
    constructor(context) {
        this.context = context;
        typeof window !== 'undefined' && (window.dfoCore = this);
        typeof window !== 'undefined' && (window.context = this.context);
    }

    /**
     * initializes the DFOCore object.
     * the logic is not inside the constructor function since we need
     * to leverage async/await syntax.
     * @param {*} web3
     * @param {*} providerOptions
     */
    init = async(web3, providerOptions = {}) => {
        // return if already initialized
        if (this.initialized) return;
        this.itemsTokens = JSON.parse(await (await fetch(this.getContextElement("itemsListURL"))).text()).tokens;
        try {
            // retrieve the web3 passed in the function
            this.web3 = web3;
            if (!this.web3) {
                // initialize the web3 instance
                if (!window.ethereum) {
                    const web3Modal = new Web3Modal({
                        providerOptions,
                    });
                    const prov = await web3Modal.connect();
                    this.web3 = new Web3(prov);
                } else {
                    await window.ethereum.request({method : 'eth_requestAccounts'});
                    this.web3 = new Web3(window.ethereum);
                }
                // retrieve the provider
                const provider = this.web3.currentProvider;
                provider.on = provider.on || function() {};
                this.chainId = await this.web3.eth.getChainId();
                // set the address
                const accounts = await this.web3.eth.getAccounts();
                this.address = accounts[0];
                // check for accounts changes
                provider.on('accountsChanged', (accounts) => {
                    this.address = accounts[0] || this.voidEthereumAddress;
                });
                // check for chain id changes
                provider.on('chainChanged', (chainId) => {
                    this.chainId = this.context.ethereumNetwork[chainId] ? chainId : 0;
                });
                // check for connection
                provider.on('connect', ({ chainId }) => {
                    this.chainId = chainId;
                });
                // check for disconnect
                provider.on('disconnect', ({ code, message }) => {
                    this.address = this.voidEthereumAddress;
                    this.chainId = 0;
                });
                this.provider = provider;
            }

            this.web3.currentProvider.setMaxListeners && this.web3.currentProvider.setMaxListeners(0);
            this.web3.eth.transactionBlockTimeout = 999999999;
            this.web3.eth.transactionPollingTimeout = new Date().getTime();
            this.web3.startBlock = await this.web3.eth.getBlockNumber();
            window.web3ForLogs = window.web3 = this.web3;
            this.ethersProvider = new ethers.providers.Web3Provider(window.web3.currentProvider);

            // set the core as initialized
            this.initialized = true;
            await this.tryLoadCustomWeb3();
        } catch (error) {
            this.initialized = false;
        }
        var itemsContext = JSON.parse(await (await fetch(this.getContextElement("itemsContextURL"))).text());
        this.context.pandorasBox = itemsContext.pandorasBox;
        this.context.pandorasBoxURL = itemsContext.pandorasBoxURL;
        this.context.pandorasBox = (this.context.pandorasBox || []).map(it => this.web3.utils.toChecksumAddress(it));
        try {
            var pandorasBox = JSON.parse(await (await fetch(this.context.pandorasBoxURL)).text());
            this.context.pandorasBox.push(...pandorasBox.map(it => this.web3.utils.toChecksumAddress(it)).filter(it => this.context.pandorasBox.indexOf(it) === -1));
        } catch (e) {}
    }

    tryLoadCustomWeb3 = async() => {
        if(typeof window === 'undefined') {
            return;
        }
        var localContext;
        try {
            localContext = await (await fetch('assets/data/context.local.json')).json();
            window.context = window.deepCopy(window.context, localContext);
            window.context.testScripts && await Promise.all(window.context.testScripts.map(it => new Promise(function(ok) {
                var script = document.createElement('script');
                script.src = it;
                script.type = 'text/javascript';
                script.onload = ok;
                document.getElementsByTagName('head')[0].appendChild(script);
            })));
            if (window.context.blockchainConnectionString) {
                window.provider = window.Ganache ? window.Ganache.provider({
                    total_accounts: 15,
                    default_balance_ether: 9999999999999999999,
                    fork: window.context.blockchainConnectionString,
                    asyncRequestProcessing: true,
                    db: window.MemDOWN(),
                    gasLimit: window.gasLimit = parseInt((await new Web3(window.context.blockchainConnectionString).eth.getBlock("latest")).gasLimit)
                }) : window.context.blockchainConnectionString;
                var web3 = new Web3(window.provider, null, { transactionConfirmationBlocks: 1 });
                !window.Ganache && web3.currentProvider.setMaxListeners && window.web3.currentProvider.setMaxListeners(0);
                !window.Ganache && (web3.eth.transactionBlockTimeout = 999999999);
                !window.Ganache && (web3.eth.transactionPollingTimeout = new Date().getTime());
                web3.startBlock = window.formatNumber(await web3.eth.getBlockNumber());
                this.chainId = await web3.eth.getChainId();
                this.address = (await web3.eth.getAccounts())[0];
                window.web3ForLogs = window.web3 = this.web3 = web3;
            }
            if (window.context.blockchainConnectionForLogString) {
                var web3 = new Web3(window.context.blockchainConnectionForLogString);
                web3.currentProvider.setMaxListeners && web3.currentProvider.setMaxListeners(0);
                web3.eth.transactionBlockTimeout = 999999999;
                web3.eth.transactionPollingTimeout = new Date().getTime();
                web3.startBlock = await web3.eth.getBlockNumber();
                window.web3ForLogs = web3;
            }
        } catch (e) {
            console.error(e);
            !localContext && console.clear();
        }
    }

    addTokenToMetamask = (address, symbol, decimals, image) => {
        try {
            if (this.web3.currentProvider) {
                this.web3.currentProvider.request({
                    method: 'wallet_watchAsset',
                    params: {
                        type: "ERC20",
                        options: {
                            address,
                            symbol,
                            decimals,
                            image,
                        },
                    },
                    id: Math.round(Math.random() * 100000),
                }, (err, added) => {
                    console.log('provider returned', err, added)
                })
            } else if (window.web3.currentProvider) {
                window.web3.currentProvider.request({
                    method: 'wallet_watchAsset',
                    params: {
                        type: "ERC20",
                        options: {
                            address,
                            symbol,
                            decimals,
                            image,
                        },
                    },
                    id: Math.round(Math.random() * 100000),
                }, (err, added) => {
                    console.log('provider returned', err, added)
                })
            }
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * returns the contract with the given abi and address if it's already stored
     * in the state, otherwise it creates it and stores it inside a variable.
     * @param {*} abi contract ABI.
     * @param {*} address contract address.
     */
    getContract = async(abi, address) => {
        address = address || this.voidEthereumAddress;
        // create the key
        const key = (((address && address.toLowerCase()) || "") + this.web3.utils.sha3(JSON.stringify(abi)));
        this.contracts[key] = this.contracts[key] || new this.web3.eth.Contract(abi, address);
        if(abi === this.getContextElement("ERC20ABI") || abi === this.getContextElement("IERC20ABI") && this.contracts[key].isItem === undefined) {
            this.contracts[key].isItem = false;
            try {
                var interoperable = await this.getContract(this.getContextElement("IEthItemInteroperableInterfaceABI"), address);
                this.contracts[key].mainInterface = await interoperable.methods.mainInterface().call();
                this.contracts[key].isItem = interoperable.options.address !== this.web3.utils.toChecksumAddress(this.getContextElement("osTokenAddress"));
            } catch(e) {}
        }
        this.isItemDictionary = this.isItemDictionary || {};
        this.isItemDictionary[address] = this.contracts[key].isItem;
        return this.contracts[key];
    }

    getEthersContract = async(abi, address) => {
        address = address || this.voidEthereumAddress;
        // create the key
        this.ethersContract = this.ethersContract || {};
        const key = (((address && address.toLowerCase()) || "") + this.web3.utils.sha3(JSON.stringify(abi)));
        this.ethersContract[key] = this.ethersContract[key] || new ethers.Contract(address, abi, this.ethersProvider);
        if(abi === this.getContextElement("ERC20ABI") || abi === this.getContextElement("IERC20ABI") && this.ethersContract[key].isItem === undefined) {
            this.ethersContract[key].isItem = false;
            try {
                var interoperable = await this.getEthersContract(this.getContextElement("IEthItemInteroperableInterfaceABI"), address);
                this.ethersContract[key].mainInterface = await interoperable.methods.mainInterface().call();
                this.ethersContract[key].isItem = true;
            } catch(e) {}
        }
        this.isItemDictionary = this.isItemDictionary || {};
        this.isItemDictionary[address] = this.ethersContract[key].isItem;
        return this.ethersContract[key];
    }

    isItem = async address => {
        return (await this.getContract(this.getContextElement("ERC20ABI"), address)).isItem;
    }

    isItemSync = address => {
        var toChecksumAddress = this.web3.utils.toChecksumAddress;
        return window.dfoCore.itemsTokens.filter(it => toChecksumAddress(it.address) === toChecksumAddress(address)).length > 0;
    }

    getTokenSymbol = async (address) => {
        var token = await this.getContract(this.getContextElement('ERC20ABI'), address);
        var symbol = await token.methods.symbol().call();
        return symbol;
    }

    /**
     * returns the element with the given elementName from the context.
     * @param {*} elementName name of the element to retrieve from the context.
     */
    getContextElement = (elementName) => {
        return this.context[elementName + (this.context.ethereumNetwork[this.chainId] || "")] || this.context[elementName];
    }

    /**
     * returns the element with the given elementName from the context for the current chain network.
     * @param {*} elementName name of the element to retrieve from the context.
     */
    getNetworkContextElement = (elementName) => {
        const network = this.context.ethereumNetwork[this.chainId];
        return this.context[`${elementName}${network}`];
    }

    numberToString = (num, locale) => {
        if (num === undefined || num === null) {
            num = 0;
        }
        if ((typeof num).toLowerCase() === 'string') {
            return num;
        }
        let numStr = String(num);

        if (Math.abs(num) < 1.0) {
            let e = parseInt(num.toString().split('e-')[1]);
            if (e) {
                let negative = num < 0;
                if (negative) num *= -1
                num *= Math.pow(10, e - 1);
                numStr = '0.' + (new Array(e)).join('0') + num.toString().substring(2);
                if (negative) numStr = "-" + numStr;
            }
        } else {
            let e = parseInt(num.toString().split('+')[1]);
            if (e > 20) {
                e -= 20;
                num /= Math.pow(10, e);
                numStr = num.toString() + (new Array(e + 1)).join('0');
            }
        }
        if (locale === true) {
            var numStringSplitted = numStr.split(' ').join('').split('.');
            return parseInt(numStringSplitted[0]).toLocaleString() + (numStringSplitted.length === 1 ? '' : ('.' + numStringSplitted[1]))
        }
        return numStr;
    }

    formatNumber = (value) => {
        return parseFloat(this.numberToString(value).split(',').join(''));
    }

    /**
     * returns the sending options for the given method and value.
     * if no params are used, the {from: address, gas: '99999999'} object is returned.
     * @param {*} method contract method that will be called.
     * @param {*} value eventual amount of ETH that will be sent.
     */
    getSendingOptions = async(method, value) => {
        try {
            // if a method is provided we use it to estimate the gas
            if (method) {
                // retrieve the nonce
                const nonce = await this.web3.eth.getTransactionCount(this.address);
                // estimate the gase for the method
                const gas = await method.estimateGas({
                    nonce,
                    from: this.address,
                    gasPrice: this.web3.utils.toWei('13', 'gwei'),
                    value: value || 0,
                    gas: '7900000',
                    gasLimit: '7900000',
                });
                // return the sending options
                return { nonce, from: this.address, gas: gas || '7900000', value: value || 0, }
            }
        } catch (error) {
            // catch any error and log it

        } finally {
            // return this after any error or if no method is provided
            return { from: this.address, gas: '99999999', };
        }
    }

    /**
     * returns the current block number.
     */
    getBlockNumber = async() => {
        return await this.web3.eth.getBlockNumber();
    }

    loadFarmingPosition = async(farmingContract, positionId) => {
        var originalPosition = await farmingContract.methods.position(positionId || 0).call();
        var position = {
            liquidityPoolTokenAmount : '0'
        };
        Object.entries(originalPosition).forEach(it => position[it[0]] = it[1]);
        try {
            position.tokenId = position.liquidityPoolTokenAmount;
            var uniswapV3NonfungiblePositionManager = await this.getContract(this.getContextElement('UniswapV3NonfungiblePositionManagerABI'), this.getContextElement('uniswapV3NonfungiblePositionManagerAddress'));
            position.liquidityPoolTokenAmount = await uniswapV3NonfungiblePositionManager.methods.positions(position.tokenId).call();
            position.liquidityPoolTokenAmount = position.liquidityPoolTokenAmount.liquidity;
        } catch(e) {
            delete position.tokenId;
        }
        return position;
    }

    /**
     * retrieves all the deployed liquidity mining contracts from the given factory address.
     */
    loadDeployedFarmingContracts = async(factoryAddress, generation) => {
        if(!generation) {
            var contracts = [];
            var c = await this.loadDeployedFarmingContracts(this.getContextElement('farmGen2FactoryAddressRegular'), 'gen2');
            c && contracts.push(...c);
            var c = await this.loadDeployedFarmingContracts(undefined, 'gen2');
            c && contracts.push(...c);
            c = await this.loadDeployedFarmingContracts(undefined, 'gen1');
            c && contracts.push(...c);
            return contracts;
        }
        try {
            if (!factoryAddress) factoryAddress = this.getContextElement(generation === 'gen2' ? "farmGen2FactoryAddress" : "farmFactoryAddress");
            const deployedFarmingContracts = [];
            const events = await window.getLogs({
                address: factoryAddress,
                topics: [
                    this.web3.utils.sha3('Deployed(address,address,address,bytes)')
                ],
                fromBlock: this.getContextElement('deploySearchStart'),
                toBlock : 'latest'
            });
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                const farmMainAddress = window.web3.eth.abi.decodeParameter("address", event.topics[2]);
                const contract = await this.getContract(this.getContextElement(generation === 'gen2' ? "NewFarmingABI" : "FarmMainGen1ABI"), farmMainAddress);
                const extensionAddress = await contract.methods.host().call();
                const extensionContract = await this.getContract(this.getContextElement(generation === 'gen2' ? "FarmExtensionGen2ABI" : "FarmExtensionGen1ABI"), extensionAddress);
                const { host } = await extensionContract.methods.data().call();
                deployedFarmingContracts.push({ address: farmMainAddress, sender: host, generation });
            }
            return deployedFarmingContracts;
        } catch (error) {
            if ((error.message || error).indexOf("header not found") !== -1) {
                return await this.loadDeployedFarmingContracts(factoryAddress);
            }
            console.error(error);
            return [];
        }
    }

    loadDeployedFixedInflationContracts = async(factoryAddress) => {
        try {
            if (!factoryAddress) factoryAddress = this.getContextElement("fixedInflationFactoryAddress");
            const events = await window.getLogs({
                address: factoryAddress,
                topics: [
                    this.web3.utils.sha3('Deployed(address,address,address,bytes)')
                ],
                fromBlock: 0,
                toBlock: 'latest'
            });
            this.deployedFixedInflationContracts = [];
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                const fixedInflationAddress = window.web3.eth.abi.decodeParameter("address", event.topics[2]);
                const contract = await this.getContract(this.getContextElement("NewFixedInflationABI"), fixedInflationAddress);
                const extensionAddress = await contract.methods.host().call();
                const extensionContract = await this.getContract(this.getContextElement("FixedInflationExtensionABI"), extensionAddress);
                const { host } = await extensionContract.methods.data().call();
                this.deployedFixedInflationContracts.push({ address: fixedInflationAddress, sender: host });
            }
        } catch (error) {
            if ((error.message || error).indexOf("header not found") !== -1) {
                return await this.loadDeployedFixedInflationContracts(factoryAddress);
            }
            this.deployedFixedInflationContracts = [];
        }
    };

    loadIndexTokens = async(indexAddress) => {
        try {
            if (!indexAddress) indexAddress = this.getContextElement("indexAddress");
            const indexContract = await this.getContract(this.getContextElement("IndexABI"), indexAddress);
            const events = await window.getLogs({
                address: indexAddress,
                topics: [
                    this.web3.utils.sha3('NewIndex(uint256,address,address,uint256)')
                ],
                fromBlock: this.chainId === 1 ? 11806961 : '0',
                toBlock : 'latest'
            });
            var map = {};
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                const objectId = window.web3.eth.abi.decodeParameter("uint256", event.topics[1]);
                const address = window.web3.eth.abi.decodeParameter("address", event.topics[2]);
                map[objectId] = map[objectId] || { address, objectId };
            }
            this.indexTokens = Object.values(map);
        } catch (error) {
            if ((error.message || error).indexOf("header not found") !== -1) {
                return await this.loadIndexTokens(indexAddress);
            }
            this.indexTokens = this.indexTokens || [];
        }
    }

    getFarmingContractGenerationByAddress = async address => {
        var farmGen2FactoryAddressRegular = this.getContextElement("farmGen2FactoryAddressRegular");
        var gen2FarmingFactoryAddress = this.getContextElement("farmGen2FactoryAddress");
        var gen1FarmingFactoryAddress = this.getContextElement("farmFactoryAddress");
        var log = await window.getLogs({
            address: [
                farmGen2FactoryAddressRegular,
                gen2FarmingFactoryAddress,
                gen1FarmingFactoryAddress
            ],
            topics: [
                this.web3.utils.sha3('Deployed(address,address,address,bytes)'),
                [],
                this.web3.eth.abi.encodeParameter("address", address)
            ],
            fromBlock: 0,
            toBlock: 'latest'
        });
        return log[0].address.toLowerCase() === gen1FarmingFactoryAddress.toLowerCase() ? "gen1" : "gen2";
    }

    getHostedFarmingContracts = async(factoryAddress, generation) => {
        if(!generation) {
            var contracts = [];
            var c = await this.getHostedFarmingContracts(this.getContextElement("farmGen2FactoryAddressRegular"), 'gen2');
            c && contracts.push(...c);
            var c = await this.getHostedFarmingContracts(undefined, 'gen2');
            c && contracts.push(...c);
            c = await this.getHostedFarmingContracts(undefined, 'gen1');
            c && contracts.push(...c);
            return contracts;
        }
        try {
            if (!factoryAddress) factoryAddress = this.getContextElement(generation === 'gen2' ? "farmGen2FactoryAddress" : "farmFactoryAddress");
            const deployedFarmingContracts = [];
            const events = await window.getLogs({
                address: factoryAddress,
                topics: [
                    this.web3.utils.sha3('Deployed(address,address,address,bytes)')
                ],
                fromBlock: 0,
                toBlock: 'latest'
            });
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                const farmMainAddress = window.web3.eth.abi.decodeParameter("address", event.topics[2]);
                const contract = await this.getContract(this.getContextElement(generation === 'gen2' ? "NewFarmingABI" : "FarmMainGen1ABI"), farmMainAddress);
                const extensionAddress = await contract.methods.host().call();
                const extensionContract = await this.getContract(this.getContextElement(generation === 'gen2' ? "FarmExtensionGen2ABI" : "FarmExtensionGen1ABI"), extensionAddress);
                const { host } = await extensionContract.methods.data().call();
                deployedFarmingContracts.push({ address: farmMainAddress, sender: host, generation });
            }
            return deployedFarmingContracts.filter((item) => item.sender.toLowerCase() === this.address.toLowerCase());
        } catch (error) {
            if ((error.message || error).indexOf("header not found") !== -1) {
                return await this.getHostedFarmingContracts(factoryAddress);
            }
            console.error(error);
            return [];
        }
    }

    loadFarmingSetup = async (contract, i) => {

        try {
            return await contract.methods.setup(i).call();
        } catch(e) {
        }

        var models = {
            setup : {
                types : [
                    "uint256",
                    "bool",
                    "uint256",
                    "uint256",
                    "uint256",
                    "uint256",
                    "uint256",
                    "uint256"
                ],
                names : [
                    "infoIndex",
                    "active",
                    "startBlock",
                    "endBlock",
                    "lastUpdateBlock",
                    "objectId",
                    "rewardPerBlock",
                    "totalSupply"
                ]
            },
            info : {
                types : [
                    "bool",
                    "uint256",
                    "uint256",
                    "uint256",
                    "uint256",
                    "uint256",
                    "address",
                    "address",
                    "address",
                    "address",
                    "bool",
                    "uint256",
                    "uint256",
                    "uint256"
                ],
                names : [
                    "free",
                    "blockDuration",
                    "originalRewardPerBlock",
                    "minStakeable",
                    "maxStakeable",
                    "renewTimes",
                    "ammPlugin",
                    "liquidityPoolTokenAddress",
                    "mainTokenAddress",
                    "ethereumAddress",
                    "involvingETH",
                    "penaltyFee",
                    "setupsCount",
                    "lastSetupIndex"
                ]
            }
        };
        var data = await this.web3.eth.call({
            to : contract.options.address,
            data : contract.methods.setup(i).encodeABI()
        });
        var types = [
            `tuple(${models.setup.types.join(',')})`,
            `tuple(${models.info.types.join(',')})`
        ];
        try {
            data = abi.decode(types, data);
        } catch(e) {
        }
        var setup = {};
        for(var i in models.setup.names) {
            var name = models.setup.names[i];
            var value = data[0][i];
            value !== true && value !== false && value && (value = value && value.toString());
            setup[name] = value;
        }
        var info = {};
        for(var i in models.info.names) {
            var name = models.info.names[i];
            var value = data[1][i];
            value !== true && value !== false && value && (value = value && value.toString());
            info[name] = value;
        }
        info.startBlock = info.startBlock || "0";
        return [setup, info];
    }

    isValidPosition = (position) => {
        return position.uniqueOwner !== this.voidEthereumAddress && position.creationBlock !== '0' && position.uniqueOwner.toLowerCase() === this.address.toLowerCase();
    }

    applyGasMultiplier = (gasLimit, tokens) => {
        const gasMultiplierTokens = this.getContextElement("gasMultiplierTokens");
        const hasGasMultiplierToken = tokens.some((it) => gasMultiplierTokens.includes(it));
        return hasGasMultiplierToken ? parseInt(gasLimit) * parseFloat(this.getContextElement("gasMultiplier")) : gasLimit;
    }

    loadPositions = async(factoryAddress, generation) => {
        if(!generation) {
            var p = [];
            await this.loadPositions(this.getContextElement('farmGen2FactoryAddressRegular'), 'gen2');
            this.positions && p.push(...this.positions);
            await this.loadPositions(undefined, 'gen2');
            this.positions && p.push(...this.positions);
            await this.loadPositions(undefined, 'gen1');
            this.positions && p.push(...this.positions);
            return this.positions = p;
        }
        try {
            if (!factoryAddress) factoryAddress = this.getContextElement(generation === 'gen2' ? "farmGen2FactoryAddress" : "farmFactoryAddress");
            const deployedFarmingContracts = [];
            const events = await window.getLogs({
                address: factoryAddress,
                topics: [
                    this.web3.utils.sha3('Deployed(address,address,address,bytes)')
                ],
                fromBlock: this.getContextElement('deploySearchStart'),
                toBlock: 'latest'
            });
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                const farmMainAddress = window.web3.eth.abi.decodeParameter("address", event.topics[2]);
                try {
                    const contract = await this.getContract(this.getContextElement(generation === 'gen2' ? "NewFarmingABI" : "FarmMainGen1ABI"), farmMainAddress);
                    const extensionAddress = await contract.methods.host().call();
                    const extensionContract = await this.getContract(this.getContextElement(generation === 'gen2' ? "FarmExtensionGen2ABI" : "FarmExtensionGen1ABI"), extensionAddress);
                    const { host } = await extensionContract.methods.data().call();
                    deployedFarmingContracts.push({ contract, address: farmMainAddress, sender: host, generation });
                } catch (error) {
                    console.error(error);
                }
            }
            this.positions = [];
            await Promise.all(deployedFarmingContracts.map(async(c) => {
                const contract = c.contract;
                let farmTokenCollection = null;
                try {
                    const farmTokenCollectionAddress = await contract.methods._farmTokenCollection().call();
                    if (farmTokenCollectionAddress !== this.voidEthereumAddress) {
                        farmTokenCollection = await this.getContract(this.getContextElement("INativeV1ABI"), farmTokenCollectionAddress);
                    }
                } catch(e) {
                }
                const events = await window.getLogs({
                    address: c.address,
                    topics: [
                        window.web3.utils.sha3("Transfer(uint256,address,address)")
                    ],
                    fromBlock: this.getContextElement('deploySearchStart'),
                    toBlock: 'latest'
                });
                const found = [];
                for (let i = 0; i < events.length; i++) {
                    const event = events[i];
                    const { topics } = event;
                    var owner = this.web3.eth.abi.decodeParameter("address", topics[3]);
                    if (owner.toLowerCase() === this.address.toLowerCase()) {
                        var positionId = this.web3.eth.abi.decodeParameter("uint256", topics[1]);
                        const pos = await this.loadFarmingPosition(contract, positionId);
                        if (!found.includes(pos.setupIndex)) {
                            try {
                                var { '0': setup, '1': setupInfo } = await this.loadFarmingSetup(contract, pos.setupIndex);
                                setupInfo = {...setupInfo, free : setupInfo.free || c.generation === 'gen2', generation : c.generation};
                                if (this.isValidPosition(pos) && !this.positions.includes({...setup, contract, setupInfo, setupIndex: pos.setupIndex })) {
                                    this.positions.push({...setup, contract, setupInfo, setupIndex: pos.setupIndex, generation : c.generation });
                                    found.push(pos.setupIndex);
                                }
                            } catch (error) {
                                console.error(error);
                            }
                        }
                    }
                }
                if (farmTokenCollection) {
                    const farmTokenEvents = await contract.getPastEvents('FarmToken', { fromBlock: this.getContextElement('deploySearchStart') });
                    for (let i = 0; i < farmTokenEvents.length; i++) {
                        try {
                            const farmTokenEvent = farmTokenEvents[i];
                            const { returnValues } = farmTokenEvent;
                            const { objectId, setupIndex } = returnValues;
                            if (!found.includes(setupIndex)) {
                                const { '0': setup, '1': setupInfo } = await this.loadFarmingSetup(contract, setupIndex);
                                const balance = await farmTokenCollection.methods.balanceOf(this.address, objectId).call();
                                if (parseInt(balance) > 0) {
                                    this.positions.push({...setup, contract, setupInfo, setupIndex, generation : c.generation })
                                    found.push(setupIndex);
                                }
                            }
                        } catch (error) {
                            console.log(error);
                        }
                    }
                }
            }));
        } catch (error) {
            console.error(error);
            this.positions = [];
        }
    }

    /**
     * starts listening for the provided event emitted by the contract with the given abi and address using
     * the input filter and fromBlock.
     * @param {*} abi contract abi.
     * @param {*} address contract address.
     * @param {*} eventName event name to start listening for.
     * @param {*} filter event filter.
     * @param {*} fromBlock event from block.
     */
    getEventEmitter = async(abi, address, eventName, filter, fromBlock) => {
        const contract = await this.getContract(abi, address);
        if (!this.eventEmitters[address]) {
            this.eventEmitters[address] = {};
        }
        this.eventEmitters[address] = {
            ...this.eventEmitters[address],
            eventName: contract.events[eventName]({ filter: filter || {}, fromBlock: fromBlock || await this.getBlockNumber() }),
        };
    }

    uploadDataToIpfs = async(data) => {
        this.ipfsClient = this.ipfsClient || new window.IpfsHttpClient(this.getContextElement('ipfsHost'));
        const upload = await this.ipfsClient.add(data, { pin: true });
        return upload;
    }

    fromDecimals = (amount, decimals = 18) => {
        return window.numberToString(decimals === 18 ? this.web3.utils.toWei(window.numberToString(amount), 'ether') : parseFloat(window.numberToString(amount)) * 10 ** decimals).split('.')[0];
    }

    toFixed = (amount) => {
        return toFixed(amount).toString().split('.')[0];
    }

    removeDecimals = (amount) => {
        return amount.split('.')[0];
    }

    toDecimals = (amount, decimals = 18, precision) => {
        /*if (parseFloat(amount) === 0) return 0;
        precision = -Math.floor( Math.log10(amount + 1));
        if (precision < 0) precision = 4;
        const res = decimals === 18 ? this.web3.utils.fromWei(amount, 'ether') : parseInt(amount) / 10**decimals;
        return parseFloat(res).toFixed(precision);*/
        var dec = window.fromDecimals(amount, decimals, true);
        if (precision) {
            dec = window.formatMoney(dec, precision);
        }
        return dec;
    }

    isValidAddress = (address) => {
        return this.web3.utils.isAddress(address, this.chainId);
    }

    formatMoney = (value, decPlaces, thouSeparator, decSeparator) => {
        value = (typeof value).toLowerCase() !== 'number' ? parseFloat(value) : value;
        var n = value,
            decPlaces = isNaN(decPlaces = Math.abs(decPlaces)) ? 2 : decPlaces,
            decSeparator = decSeparator == undefined ? "." : decSeparator,
            thouSeparator = thouSeparator == undefined ? "," : thouSeparator,
            sign = n < 0 ? "-" : "",
            i = parseInt(n = Math.abs(+n || 0).toFixed(decPlaces)) + "",
            j = (j = i.length) > 3 ? j % 3 : 0;
        var result = sign + (j ? i.substr(0, j) + thouSeparator : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thouSeparator) + (decPlaces ? decSeparator + Math.abs(n - i).toFixed(decPlaces).slice(2) : "");
        return this.eliminateFloatingFinalZeroes(result, decSeparator);
    }

    formatLink = (link) => {
        link = (link ? link instanceof Array ? link[0] : link : '');
        if (link.indexOf('assets') === 0 || link.indexOf('/assets') === 0) {
            return link;
        }
        for (var temp of this.context.ipfsUrlTemplates) {
            link = link.split(temp).join(this.context.ipfsUrlChanger);
        }
        while (link && link.startsWith('/')) {
            link = link.substring(1);
        }
        if (link.endsWith('.eth')) {
            link += ".link";
        }
        return (!link ? '' : link.indexOf('http') === -1 ? ('https://' + link) : link).split('https:').join('').split('http:').join('');
    };

    tryRetrieveMetadata = async(item) => {
        if (item.metadataLink) {
            return;
        }
        var clearMetadata = true;
        try {
            try {
                item.metadataLink = await item.methods.uri().call();
            } catch (err) {
                item.metadataLink = await item.methods.uri(item.objectId).call();
            }
            if (item.metadataLink !== "") {
                item.image = this.formatLink(item.metadataLink);
                try {
                    item.metadata = await window.AJAXRequest(this.formatLink(item.metadataLink));
                    if (typeof item.metadata !== "string") {
                        Object.entries(item.metadata).forEach(it => item[it[0]] = it[1]);
                        item.name = item.item_name || item.name;
                        item.description = item.description && item.description.split('\n\n').join(' ');
                    }
                } catch (e) {
                    delete item.image;
                    item.image = this.getElementImage(item);
                    item.metadataMessage = `Could not retrieve metadata, maybe due to CORS restriction policies for the link (<a href="${item.metadataLink}" target="_blank">${item.metadataLink}</a>), check it on <a href="${item.collection ? window.context.openSeaItemLinkTemplate.format(item.collection.address, item.objectId) : window.context.openSeaCollectionLinkTemplate.format(item.address)}" target="_blank">Opensea</a>`
                    console.error(item.metadataMessage);
                }
                clearMetadata = false;
            }
        } catch (e) {}
        clearMetadata && delete item.metadata;
        clearMetadata && (item.metadataLink = clearMetadata ? "blank" : item.metadataLink);
    }

    eliminateFloatingFinalZeroes = (value, decSeparator) => {
        decSeparator = decSeparator || '.';
        if (value.indexOf(decSeparator) === -1) {
            return value;
        }
        var split = value.split(decSeparator);
        while (split[1].endsWith('0')) {
            split[1] = split[1].substring(0, split[1].length - 1);
        }
        return split[1].length === 0 ? split[0] : split.join(decSeparator);
    }

    normalizeValue = (amount, decimals) => {
        return this.web3.utils.toBN(amount).mul(this.web3.utils.toBN(10 ** (18 - decimals))).toString();
    }

    denormalizeValue = (amount, decimals) => {
        return this.web3.utils.toBN(amount).div(this.web3.utils.toBN(10 ** (18 - decimals))).toString();
    }

    normalizeFixed = (amount, decimals) => {
        return this.toFixed(this.normalizeValue(amount, decimals));
    }

    toDecimalsNormalizedFixed = (amount, decimals = 18, precision = 4) => {
        return this.toDecimals(this.normalizeFixed(amount, decimals), decimals, precision);
    }

    /**
     * returns the dfo with the given dfoAddress (proxy or doubleProxy depending on the version we're in).
     * @param {*} dfoAddress proxy or double proxy address of the dfo to retrieve.
     * @param {*} dfoAddresses other dfo addresses.
     */
    async loadDFO(dfoAddress, dfoAddresses) {
        dfoAddresses = dfoAddresses ? dfoAddresses.concat(dfoAddress) : [dfoAddress];
        // TODO retrieve DFO
    }

    tryRetrieveWellKnownTokenImage = function tryRetrieveWellKnownTokenImage(address) {
        address = this.web3.utils.toChecksumAddress(address || this.voidEthereumAddress);
        var wellKnownTokens = this.getContextElement("wellKnownTokens") || {};
        var wellKnownTokensStart = JSON.parse(JSON.stringify(wellKnownTokens));
        wellKnownTokens = {};
        Object.entries(wellKnownTokensStart).forEach(it => wellKnownTokens[this.web3.utils.toChecksumAddress(it[0] || this.voidEthereumAddress)] = window.formatLink(it[1]));
        return wellKnownTokens[address];
    }

}

function toFixed(x) {
    if (Math.abs(x) < 1.0) {
        var e = parseInt(x.toString().split('e-')[1]);
        if (e) {
            x *= Math.pow(10, e - 1);
            x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
        }
    } else {
        var e = parseInt(x.toString().split('+')[1]);
        if (e > 20) {
            e -= 20;
            x /= Math.pow(10, e);
            x += (new Array(e + 1)).join('0');
        }
    }
    return x;
}