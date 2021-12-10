import React from 'react';
import { StyleSheet, Image, PixelRatio } from 'react-native';

const channelDefaultLogo = require('../../assets/images/channelDefaultLogo.png');
const APP_CONFIG = require('../../../../configs/app_config.json');

const ChannelLogo = ({ assets }) => {
    const src =
        assets && assets['logo']
            ? {
                uri: APP_CONFIG.endpoints.imagesAssets + assets['logo'],
            }
            : channelDefaultLogo;
    return <Image source={src} style={styles.channelLogo} />;
};

export default React.memo(ChannelLogo);

const styles = StyleSheet.create({
    channelLogo: {
        width: 70 / PixelRatio.get(),
        height: 70 / PixelRatio.get(),
        alignSelf: 'center',
        resizeMode: 'contain',
    },
});
