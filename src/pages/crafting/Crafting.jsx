import { PageContainer } from "../../components";
import dragonImage from '../../assets/images/4.png';
import { Route, Switch } from "react-router-dom";
import CraftingDapp from './dapp/dapp';

const lorem = 'Covenant wizards have made a breakthrough in the science of liquidity, and Etherereans can now Craft it at the molecular level. A crack team of entrepreneurial penguins have already used this discovery to innovate Craftable Initial Liquidity Offerings (ILOs). Projects can use ILOs to provide initial liquidity for tokens with deep customization and security.The Wizards will be publishing their latest findings soon. In the meantime, you can read their preliminary report in the beta Grimoire at unifihub.com';

const Crafting = () => {
    return (
        <Switch>
            {
                /*
                    <Route path="/crafting/dapp">
                        <CraftingDapp />
                    </Route>
                */
            }
            <Route path="/crafting/">
                <PageContainer image={dragonImage} imageHeight={300} text={lorem} launchDapp={false} title={"Crafting"} buttonText={"Coming soon"} />
            </Route>
        </Switch>
    )
}

export default Crafting;