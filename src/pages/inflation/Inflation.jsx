import { PageContainer } from "../../components";
import homeInflationImage from '../../assets/images/1.png';
import { Route, Switch } from "react-router-dom";
import InflationDapp from './dapp/dapp';

const lorem = 'Covenant inflation contracts allow Ethereans to fund their magical projects in a fair and safe way. Anyone can set one up to inflate any variety of tokens at daily, weekly and monthly intervals via minting, swapping and transferring. Don’t depend on ICOs or worry about soliciting investors anymore.';

const Inflation = () => {
    return (
        <Switch>
            {
                <Route path="/inflation/dapp">
                    <InflationDapp />
                </Route>
            }
            <Route path="/inflation/">
                <PageContainer image={homeInflationImage} imageHeight={300} text={lorem} launchDapp={true} title={"Inflation"} buttonText={"Coming soon"} link={'/inflation/dapp'} />
            </Route>
        </Switch>
    )
}

export default Inflation;