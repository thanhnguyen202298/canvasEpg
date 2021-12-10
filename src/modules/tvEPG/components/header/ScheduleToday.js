import React, { } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image
} from 'react-native';
import { TouchableOpacity } from 'react-native-tvfocus';

import { CELLHOUR, HEADER_CELL_HEIGHT, guideThemes } from '../../constants';
const iconPrev = require('../../assets/images/arrow_previous.png');
const iconNext = require('../../assets/images/arrow_next.png')

export default function ScheduleToday() {
    return (
        <View
            style={styles.contain}>
            <TouchableOpacity>
                <Image style={styles.icon} source={iconPrev} />
            </TouchableOpacity>
            <Text style={styles.content}> Today</Text>
            <TouchableOpacity>
                <Image style={styles.icon} source={iconNext} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    contain: {
        color: guideThemes.COLOR_TEXT,
        backgroundColor: guideThemes.BG_HEADER,
        height: HEADER_CELL_HEIGHT,
        justifyContent: 'space-between',
        width: CELLHOUR,
        textAlign: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        width: 200,
        backgroundColor: 'red'
    },
    content: {
        color: guideThemes.COLOR_TEXT,
        // fontSize: guideThemes.TITLE_SIZE
    },
    icon: {
        width: 24,
        height: 26
    }
});
