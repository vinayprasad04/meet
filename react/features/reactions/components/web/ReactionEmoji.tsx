import React, { Component } from 'react';

// @ts-ignore
import { connect } from '../../../base/redux';
import { removeReaction } from '../../actions.any';
import { REACTIONS } from '../../constants';
import { IStore } from '../../../app/types';

type Props = {

    /**
     * Reaction to be displayed.
     */
    reaction: string,

    /**
     * Id of the reaction.
     */
    uid: string,

    /**
     * Removes reaction from redux state.
     */
    reactionRemove: Function,

    /**
     * Index of the reaction in the queue.
     */
    index: number
};

type State = {

    /**
     * Index of CSS animation. Number between 0-20.
     */
    index: number
}


/**
 * Used to display animated reactions.
 *
 * @returns {ReactElement}
 */
class ReactionEmoji extends Component<Props, State> {
    /**
     * Initializes a new {@code ReactionEmoji} instance.
     *
     * @param {Props} props - The read-only React {@code Component} props with
     * which the new instance is to be initialized.
     */
    constructor(props: Props) {
        super(props);

        this.state = {
            index: props.index % 21
        };
    }

    /**
     * Implements React Component's componentDidMount.
     *
     * @inheritdoc
     */
    componentDidMount() {
        setTimeout(() => this.props.reactionRemove(this.props.uid), 5000);
    }

    /**
     * Implements React's {@link Component#render}.
     *
     * @inheritdoc
     */
    render() {
        const { reaction, uid } = this.props;
        const { index } = this.state;

        return (
            <div
                className = { `reaction-emoji reaction-${index}` }
                id = { uid }>
                { REACTIONS[reaction].emoji }
            </div>
        );
    }
}

const mapDispatchToProps = (dispatch: IStore['dispatch']) => ({
    reactionRemove: (uid: string) => dispatch(removeReaction(uid))
});

export default connect(null, mapDispatchToProps)(ReactionEmoji);
