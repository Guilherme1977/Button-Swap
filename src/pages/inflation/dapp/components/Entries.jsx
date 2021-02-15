export default function Entries(props) {
    return <>
        <div className="row">
            <div className="col-5">
                <h6 className="text-secondary"><b>Entries:</b></h6>
            </div>
            <div className="col-3">
                <button onClick={props.editOrAddEntry} className="btn btn-outline-secondary">Add</button>
            </div>
        </div>
        {props.entries.length === 0 && <span>No entries</span>}
        {props.entries.map((entry, entryIndex) => <div key={entry.name} className="row">
            <div className="col-8">
                <p><b>{entry.name}</b> ({entry.operations.length} operations)</p>
            </div>
            <div className="col-4 flex">
                <button className="btn btn-sm btn-danger ml-1" onClick={() => props.editOrAddEntry(entryIndex)}><b>EDIT</b></button>
                <button className="btn btn-sm btn-outline-danger mr-1" onClick={() => props.removeEntry(entryIndex)}><b>X</b></button>
            </div>
        </div>)}
    </>
}