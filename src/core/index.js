import Web3 from "web3";
import Web3Modal from "web3modal";

export default class DFOCore {
    address = '0x0000000000000000000000000000000000000000';
    chainId;
    context;
    contracts = {};
    initialized = false;
    provider;
    voidEthereumAddress = '0x0000000000000000000000000000000000000000';
    web3;

    /**
     * constructs the DFOCore object by passing the context json object.
     * @param {*} context app context.
     */
    constructor(context) { 
        this.context = context;
    }

    /**
     * initializes the DFOCore object.
     * the logic is not inside the constructor function since we need
     * to leverage async/await syntax.
     * @param {*} web3 
     * @param {*} providerOptions 
     */
    async init(web3, providerOptions = {}) {
        // return if already initialized
        if (this.initialized) return;
        // retrieve the web3 passed in the function
        this.web3 = web3;
        if (!this.web3) {
            // no web3 instance is passed, we create it by opening the modal
            const web3Modal = new Web3Modal({
                providerOptions,
            });
            // retrieve the provider
            const provider = await web3Modal.connect();
            // initialize the web3 instance
            this.web3 = new Web3(provider);
            // set the address
            const accounts = await this.web3.eth.getAccounts();
            this.address = accounts[0];
            // check for accounts changes
            provider.on('accountsChanged', (accounts) => {
                this.address = accounts[0] || this.voidEthereumAddress;
                console.log(`changed address to ${this.address}`);
            });
            // check for chain id changes
            provider.on('chainChanged', (chainId) => {
                this.chainId = this.context.ethereumNetwork[chainId] ? chainId : 0;
                console.log(`changed chainId to ${this.chainId}`);
            })
            // check for connection
            provider.on('connect', ({ chainId }) => {
                this.chainId = chainId;
            });
            // check for disconnect
            provider.on('disconnect', ({ code, message }) => {
                console.log({ code, message });
                this.address = this.voidEthereumAddress;
                this.chainId = 0;
            });
            this.provider = provider;
        }
        // set the core as initialized
        this.initialized = true;
    }

    /**
     * returns the contract with the given abi and address if it's already stored
     * in the state, otherwise it creates it and stores it inside a variable.
     * @param {*} abi contract ABI.
     * @param {*} address contract address.
     */
    async getContract(abi, address) {
        this.address = address || this.voidEthereumAddress;
        // create the key
        const key = address.toLowerCase();
        this.contracts[key] = this.contracts[key] || new this.web3.eth.Contract(abi, address === this.voidEthereumAddress ? undefined : address);
        return this.contracts[key];
    }

    /**
     * returns the element with the given elementName from the context.
     * @param {*} elementName name of the element to retrieve from the context.
     */
    getContextElement(elementName) {
        return this.context[elementName];
    }

    /**
     * returns the element with the given elementName from the context for the current chain network.
     * @param {*} elementName name of the element to retrieve from the context.
     */
    getNetworkContextElement(elementName) {
        const network = this.context.ethereumNetwork[this.chainId];
        return this.context[`${elementName}${network}`];
    }

    /**
     * returns the sending options for the given method and value.
     * if no params are used, the {from: address, gas: '99999999'} object is returned.
     * @param {*} method contract method that will be called.
     * @param {*} value eventual amount of ETH that will be sent.
     */
    async getSendingOptions(method, value) {
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
            console.error(error);
        } finally {
            // return this after any error or if no method is provided
            return { from: this.address, gas: '99999999', };
        }
    }

    async getBlockNumber() {
        return await this.web3.eth.getBlockNumber();
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

}