import Coin from '../coin/Coin';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

const Input = (props) => {
    const { label, min, max, value, onChange, showBalance, balance, showMax, showCoin, address, name, tokenImage, extra, decimals } = props;
    const [val, setVal] = useState(value);
    const [isItem, setIsItem] = useState(false);

    isItem && console.log(address, "is item");

    useEffect(() => {
        //window.dfoCore.isItem(address).then(setIsItem);
    }, [address]);

    useEffect(() => {
        setVal(value);
        //onChange && onChange(value);
    }, [value])

    const onRealChange = (value) => {
        setVal(value);
        onChange(onDetectedChange(value));
    }

    const onDetectedChange = (value, sendBalance) => {
        if (sendBalance) return { target: { value: balance, isFull : decimals ? true : false }};
        if (!value) return { target: { value: 0 }};
        return { target: { value } };
    } 

    return (
        <>
            { label && <h6><b>{label}</b></h6> }
            <div className="input-group" tabIndex={0}>
                <input disabled={props.disabled} type="number" lang="en-US" step="any" className={`form-control ${showBalance && parseFloat(val) > window.formatNumber(decimals ? window.fromDecimals(balance, decimals, true) : balance) ? 'is-invalid' : ''}`} value={val} min={min} max={max || (decimals ? window.fromDecimals(balance, decimals, true) : balance)} onChange={(e) => onRealChange(e.target.value)}/>
                {
                    showCoin && <div className={`input-group-append`}>
                        <span className={`input-group-text ${showBalance && parseFloat(val) > window.formatNumber(decimals ? window.fromDecimals(balance, decimals, true) : balance) ? 'is-invalid' : ''}`} id=""><Coin address={address} forcedImage={tokenImage} /> {name}</span>
                    </div>
                }
            </div>
            <aside>
            {
                showMax && 
                    <a onClick={() => onChange(onDetectedChange(0, balance))} type="button">MAX</a>
            }
            { showBalance && <span className="BalanceImputPRCD">Balance: {balance.indexOf("0.00") === 0 ? balance : window.formatMoney(decimals ? window.fromDecimals(balance, decimals, true) : balance, 2)} {name} {extra ? extra : ''}</span> }
            </aside>
        </>
    )
}

export default Input;