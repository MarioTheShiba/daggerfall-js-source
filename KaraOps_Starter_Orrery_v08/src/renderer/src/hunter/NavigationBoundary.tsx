import {Component,type ReactNode} from 'react'

// A malformed/stale route display must never take down the geometry or the app.
export class NavigationBoundary extends Component<{children:ReactNode;resetKey:string},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  componentDidUpdate(previous:{resetKey:string}){if(this.state.failed&&previous.resetKey!==this.props.resetKey)this.setState({failed:false})}
  render(){return this.state.failed?<p role="alert">Navigation display failed. The reconstructed map is retained; reopen the 2D X-Ray to retry.</p>:this.props.children}
}
