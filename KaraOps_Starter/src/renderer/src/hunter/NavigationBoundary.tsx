import {Component,type ReactNode} from 'react'

// A malformed/stale route display must never take down the geometry or the app.
export class NavigationBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  render(){return this.state.failed?<p role="alert">Navigation display failed. The reconstructed map is retained; recalculate navigation to retry.</p>:this.props.children}
}
