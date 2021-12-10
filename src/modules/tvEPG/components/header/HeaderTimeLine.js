import moment from 'moment';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';
import { TouchableOpacity } from 'react-native-tvfocus';
import HeaderCellTime from './HeaderCellTime';
import { v4 as uuidv4 } from 'uuid';

function HeaderTimeLine({ timeList = [] }) {
    return (
        <View style={cssHeaderLine.listtime}>
            {timeList.map((time, index) => (
                <HeaderCellTime
                    // key={time.time}
                    key={uuidv4()}
                    time={time}
                />
            ))}
        </View>
    );
};

export default React.memo(HeaderTimeLine)

const cssHeaderLine = StyleSheet.create({
    listtime: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#000000'
    },
});
