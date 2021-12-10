import moment from 'moment';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';
import { TouchableOpacity } from 'react-native-tvfocus';

import { CELLHOUR, HEADER_CELL_HEIGHT, guideThemes } from '../../constants';

function HeaderCellTime(props) {
    const { time, style, } = props;
    const styles = style ? style : hourStyle;

    return (
        <View style={styles.contain}>
            <Text style={styles.content}>
                {time.text}
            </Text>
        </View>
    );
};


export default React.memo(HeaderCellTime);

const hourStyle = StyleSheet.create({
    contain: {
        color: guideThemes.COLOR_TEXT,
        backgroundColor: guideThemes.BG_HEADER,
        height: HEADER_CELL_HEIGHT,
        justifyContent: 'center',
        paddingStart: 5,
        width: CELLHOUR,
        borderStartColor: 'white',
        borderStartWidth: 1
    },
    content: {
        color: guideThemes.COLOR_TEXT,
        fontSize: 18,
    },
});
