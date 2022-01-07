import React from "react";
import * as api from "../utils/api";
import {topologicalSort, transformToChildrenGraph, transformToJobsDict} from "../utils/node";
import * as status from "../utils/status";
import {withRouter} from '../utils/route'
import JobLink from "./job_link";
import RequiresLogin from "./requires_login";

export default class PipelinePage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            id: props.params.pipeline_id,
            name: '',
            status: 0,
            jobs: [],
        }
    }

    static intervalId = null;

    async refreshPipeline() {
        const data = await api.fetchDataFromApi(`fastci/api/pipeline/${this.state.id}`);

        if (data === null) {
            // TODO: Make a toast
            console.log('Failed to refresh pipeline!');
            return;
        }

        // @Speed - copying this each time just doesn't feel right
        this.setState({...transformToJobsDict(data)});
    }

    async componentDidMount() {
        // NOTE: See the NOTE: in PipelineListPage
        this.intervalId = setInterval(async () => await this.refreshPipeline(), 1000);
        await this.refreshPipeline()
    }

    componentWillUnmount() {
        clearInterval(this.intervalId);
    }

    render() {
        // TODO: handle dependencies from earlier stages correctly
        // TODO: test this on more examples

        const statusClass = status.getPipelineStatusClass(this.state.status)
        // @Speed - inefficient - copying and recalculating this here
        const stages = topologicalSort(transformToChildrenGraph(this.state.jobs));

        let graphSegments = [];

        for (const [i, stage] of Object.entries(stages)) {
            const jobNodes = stage.map((job, i) => {
                return (
                    <div className='pipeline_graph_node' key={i}>
                        <JobLink job={job}/>
                    </div>
                );
            });

            graphSegments.push(
                <div key={`${i}_stage`}>
                    {jobNodes}
                </div>
            );

            if (Number(i) !== stages.length - 1) {
                graphSegments.push(<div key={`${i}_edges`}/>);
            }

            // if (Number(i) !== stages.length - 1) {
            //     let edges = [];
            //
            //     for (const [fromIdx, from] of Object.entries(stage)) {
            //         // FIXME: if any of children are not in the next stage (which they definitely
            //         //        don't always have to be in), this works incorrectly
            //         for (const [toIdx, to] of Object.entries(from.children)) {
            //             /*
            //               Okay.
            //               So.
            //               These are some hacks... Why is all of this - I want the graph
            //               edges to connect to graph nodes correctly (obviously). And the nodes are
            //               from the html elements world, while the edges are from svg, which don't
            //               really get along. The only way I can think of to make edges snap to nodes
            //               is for me to specify the path offsets by hand, using the fact that all the
            //               nodes' heights and margins are in pixels and thus all positions can be
            //               calculated precisely. The obvious way to do this would be to set the
            //               viewBox height of the svg to be the same as the containing box's height.
            //               But that doesn't work, since updating the viewBox causes the svg element
            //               to stretch, which causes the containing box to stretch, which causes the
            //               viewBox to update and so on... And the solution is to set the viewBox to
            //               be 0 0 1 1, and just divide all pixel values by the height of the box.
            //               (P.S. I set the width of the viewBox to 1 just for consistency, it's not
            //               actually necessary)
            //               (P.P.S. I'm sure there are many other solutions, but all of the others
            //               that I can think of are equally hacky)
            //              */
            //             const norm = this.state.graphBoxHeight;
            //             const marginTop = 5;
            //             const marginBot = 15;
            //             const padding = 5;
            //             const borderWidth = 4;
            //             const textHeight = 20;
            //             const offsetY = marginTop + padding + borderWidth + textHeight / 2;
            //             const diffY = textHeight + padding * 2 + borderWidth * 2 + marginTop +
            //                 marginBot;
            //             const fromY = offsetY + diffY * fromIdx;
            //             const toY = offsetY + diffY * toIdx;
            //
            //             edges.push(
            //                 <path
            //                     key={`${fromIdx}_${toIdx}`}
            //                     stroke='#5f8ed2'
            //                     fill='none'
            //                     strokeWidth={2 / norm}
            //                     markerEnd='url(#triangle)'
            //                     d={`M 0 ${fromY / norm} C 0.5 ${fromY / norm} 0.5 ${toY / norm} 1 ${toY / norm}`}
            //                 />
            //             );
            //         }
            //     }
            //
            //     graphSegments.push(
            //         <svg key={`${i}_edges`} preserveAspectRatio='none'
            //              viewBox={`0 0 1 1`}>
            //             <defs>
            //                 <marker id='triangle' viewBox='0 0 10 10'
            //                         refX='10' refY='5'
            //                         markerUnits='strokeWidth'
            //                         markerWidth='5' markerHeight='5'
            //                         orient='auto'>
            //                     <path d='M 0 2 L 10 5 L 0 8 z' fill='#6d716d'/>
            //                 </marker>
            //             </defs>
            //             {edges}
            //         </svg>
            //     );
            // }
        }

        return (
            <RequiresLogin>
                <div className='pipeline_info_box'>
                    <div>
                        <label>Id</label>
                        <label>{this.state.id}</label>
                    </div>
                    <div>
                        <label>Name</label>
                        <label>{this.state.name}</label>
                    </div>
                    <div>
                        <label>Status</label>
                        <label className={statusClass}>
                            {status.PIPELINE_STATUS_DESCRIPTION[this.state.status]}
                        </label>
                    </div>
                </div>
                <div className='pipeline_job_graph_box'>
                    {/*<svg preserveAspectRatio='none'>*/}
                    {/*    <rect x='0' y='0' width='100%' height='100%' fill='red' opacity='0.5'/>*/}
                    {/*</svg>*/}
                    <div>
                        {graphSegments}
                    </div>
                </div>
            </RequiresLogin>
        );
    }
}

PipelinePage = withRouter(PipelinePage);
