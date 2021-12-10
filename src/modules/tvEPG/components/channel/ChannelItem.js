import moment from 'moment';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { TouchableOpacity } from 'react-native-tvfocus';
import { CELLHOUR, CELL_PROGRAM_HEIGHT, guideThemes } from '../../constants';
import ChannelLogo from './ChannelLogo';
import { get } from 'lodash';

const ChannelItem = React.memo(({ channel = {}, chanelIndex = 0 }) => {
  if (!channel || !chanelIndex) return null;
  return (
    <View style={styles.channel}>
      <Text style={styles.title} numberOfLines={2}>
        {channel?.name}
      </Text>
      <ChannelLogo assets={get(channel, 'assest')} />
    </View>
  );
});
export default ChannelItem;

const styles = StyleSheet.create({
  channel: {
    flex: 1,
    height: CELL_PROGRAM_HEIGHT,
    padding: 5,
    backgroundColor: guideThemes.BG_HEADER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelText: {
    color: guideThemes.COLOR_TEXT,
    //  fontSize: 17,
    fontWeight: 'bold',
  },
  title: {
    color: guideThemes.COLOR_TEXT,
    fontWeight: 'bold',
  },
  img: {
    backgroundColor: '#8b8b8b'
  }
});
