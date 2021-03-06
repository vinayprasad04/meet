// @flow

import React, { useEffect } from 'react';

import JitsiScreenWebView from '../../../base/modal/components/JitsiScreenWebView';
import JitsiStatusBar from '../../../base/modal/components/JitsiStatusBar';
import { renderArrowBackButton }
    from '../../../mobile/navigation/components/welcome/functions';
import { screen } from '../../../mobile/navigation/routes';
import styles from '../styles';


type Props = {

    /**
     * Default prop for navigating between screen components(React Navigation).
     */
    navigation: Object
}

/**
 * The URL at which the privacy policy is available to the user.
 */
const PRIVACY_URL = 'https://jitsi.org/meet/privacy';

const PrivacyView = ({ navigation }: Props) => {

    useEffect(() => {
        navigation.setOptions({
            headerLeft: () =>
                renderArrowBackButton(() =>
                    navigation.navigate(screen.welcome.main))
        });
    });

    return (
        <>
            <JitsiStatusBar />
            <JitsiScreenWebView
                source = { PRIVACY_URL }
                style = { styles.screenContainer } />
        </>
    );
};

export default PrivacyView;
