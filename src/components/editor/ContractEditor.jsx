import Editor from "@monaco-editor/react";
import { useState, useEffect } from "react";
import Loading from "../shared/Loading";

const ContractEditor = (props) => {
    const { onChange, dfoCore, onContract } = props;
    const [contractCode, setContractCode] = useState(props.templateCode || "");
    const [solidityVersions, setSolidityVersions] = useState([]);
    const [solVersion, setSolVersion] = useState("");
    const [contracts, setContracts] = useState(null);
    const [contract, setContract] = useState(null);
    const [contractError, setContractError] = useState("");
    const [compiling, setCompiling] = useState(false);

    useEffect(() => {
        getSolidityData()
    }, []);

    const getSolidityData = async () => {
        const { releases } = await window.SolidityUtilities.getCompilers();
        setSolidityVersions(releases);
    }

    const onUpdateContractCode = (value, event) => {
        setContractCode(value);
        onChange && onChange(value, event);
    }

    const onUploadFile = async (e) => {
        try {
            var file = e.target.files[0];
            var reader = new FileReader();
            reader.onload = function(event) {
                setContractCode(event.target.result);
            };
            reader.readAsText(file);
        } catch(e) {
        }
    }

    function cleanList(list) {
        var cleanList = Object.entries(list || {}).filter(it => {
            if(it[1].bytecode === '0x') {
                return false;
            }
            return props.filterDeployedContract ? props.filterDeployedContract(it[1], it[0]) : true;
        });
        var cleanListObject = {};
        cleanList.forEach(it => cleanListObject[it[0]] = it[1]);
        return cleanListObject;
    }

    const compileContractCode = async () => {
        try {
            setContractError("");
            setCompiling(true);
            setContracts(null);
            setContract(null);
            onContract(null);
            try {
                const result = await window.SolidityUtilities.compile(contractCode, solVersion);
                var cleanedList = cleanList(result.optimized);
                setContracts(cleanedList);
                setContract(Object.keys(cleanedList)[0]);
                onContract(Object.values(cleanedList)[0]);
            } catch(e) {
                setContractError(e.message || e);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCompiling(false);
        }
    }

    const setChosenContract = (value) => {
        setContract(value);
        onContract(contracts[value]);
    }

    return (
        <>  
            <div className="CheckboxQuestions">
                    <select className="SelectRegular" value={solVersion} onChange={(e) => setSolVersion(e.target.value)}>
                        <option value={""}>Choose version</option>
                        {
                            Object.keys(solidityVersions).map((item) => {
                                return <option key={item} value={solidityVersions[item]}>{item}</option>
                            })
                        }
                    </select>
                </div>
                <div className="InputForm">
                    <div className="InputForm">
                        <input type="file" className="imputCool" id="customFile" accept=".sol" onChange={(e) => onUploadFile(e)} />
                    </div>
            </div>
            <div className="CovCODEEDITOR">
                <Editor
                    value={contractCode}
                    defaultLanguage="sol"
                    onChange={(value, event) => onUpdateContractCode(value, event)}
                />
            </div>
            {contractError && 
                <p>
                    {contractError}
                </p>}
                <div className="Web2ActionsBTNs">
                    {!compiling && <a onClick={() => compileContractCode()} disabled={!solVersion} className="web2ActionBTN">Compile</a>}
                    {compiling && <Loading/>}
                </div>
                <div className="InputForm">
                    {
                        contracts && <select className="SelectRegular" value={contract} onChange={(e) => setChosenContract(e.target.value)}>
                            <option value={""}>Choose contract</option>
                            {
                                Object.keys(contracts).map((item) => {
                                    return <option value={item}>{item}</option>
                                })
                            }
                        </select>
                    }
                </div>
        </>
    )
}

export default ContractEditor;