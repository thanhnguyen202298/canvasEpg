import moment from 'moment';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
} from 'react-native';
import { TouchableOpacity } from 'react-native-tvfocus';
import ChannelItem from './ChannelItem';
import uuid from 'react-native-uuid';


function ChannelList({ channels }) {
    const listchanel = channels.map((c, i) =>  (
            <ChannelItem key={uuid.v4()} channel={c} chanelIndex={i} />
        )
    )

    return listchanel;
};


export default React.memo(ChannelList);
