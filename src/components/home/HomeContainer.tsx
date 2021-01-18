import { connect } from 'react-redux';
import { selectIndex, toggleDappLaunch } from '../../store/actions';
import { menu } from '../shared';

function HomeContainer(props: any) {

    return (
        <section className="main-container">
            <article className="main-container-top-row">
                <ul>
                    {
                        menu.map(
                            (menuItem, i) => (
                                <li key={menuItem.name} style={{ fontWeight: props.selectedIndex === i ? 'bold' : 'initial' }} onClick={() => props.selectIndex(i)}>
                                    <img src={menuItem.asset.default} alt="" height={30} />
                                    <span>{menuItem.name}</span>
                                </li>
                            )
                        )
                    } 
                </ul>
                <div className="main-container-section">

                </div>
            </article>
            <article className="main-container-top-row">
                <button onClick={() => props.dfoCore ? props.launchDapp() : console.log('not enabled.')} className="launch-dapp-button" disabled={props.dfoCore ? false : true}>Launch DAPP</button>
            </article>
        </section>
    )
}

function mapStateToProps(state: any) {
  const { session, core } = state;
  const { dfoCore } = core;
  const { dappLaunched, selectedIndex } = session;
  return { dappLaunched, selectedIndex, dfoCore };
}

function mapDispatchToProps(dispatch: Function) {
    return {
        launchDapp: () => dispatch(toggleDappLaunch()),
        selectIndex: (index: number) => dispatch(selectIndex(index)),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(HomeContainer);