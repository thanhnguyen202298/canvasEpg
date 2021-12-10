import React, {useState, useCallback, forwardRef, createRef} from 'react';
import PropTypes from 'prop-types';
import {TouchableOpacity} from '../touchableOpacityAndroidTv';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import {useCombinedRefs} from '../../../hooks';

export const NavigableCard = forwardRef((props, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    const {focusKey, onBlur, onFocus, hasTVPreferredFocus} = props;

    const innerRef = createRef(null);
    const combinedRef = useCombinedRefs(ref, innerRef);

    const routeName = useRoute().name;
    const lastFocus = global.focusManager.getLastFocusForRoute(routeName);
    let hasFocus =
        (focusKey !== undefined && lastFocus === focusKey) ||
        (lastFocus === undefined && hasTVPreferredFocus === true);

    useFocusEffect(
        useCallback(() => {
            hasFocus =
                (focusKey !== undefined && lastFocus === focusKey) ||
                (lastFocus === undefined && hasTVPreferredFocus === true);

            setIsVisible(true);
            return () => {
                setIsVisible(false);
            };
        }, []),
    );
    const onFocusInternal = () => {
        global.focusManager.setLastFocusForRoute(routeName, focusKey);
        if (onFocus) {
            onFocus();
        }
    };
    const onBlurInternal = () => {
        global.focusManager.setLastFocusForRoute(routeName, undefined);
        if (onBlur) {
            onBlur();
        }
    };
    return (
        <>
            {isVisible ? (
                <TouchableOpacity
                    ref={combinedRef}
                    firstFocusLeft={props.firstCardLeft}
                    lastFocusRight={props.lastCardRight}
                    onPress={() => props.onPress()}
                    onFocus={onFocusInternal}
                    onBlur={onBlurInternal}
                    style={props.style}
                    hasTVPreferredFocus={hasFocus}>
                    {props.children}
                </TouchableOpacity>
            ) : null}
        </>
    );
});

NavigableCard.propTypes = {
    onPress: PropTypes.func.isRequired, // callback used when navigation is triggered
    onFocus: PropTypes.func, // callback triggered when navigable item gains focus
    onBlur: PropTypes.func, // callback triggered when navigable item looses focus
    firstCardLeft: PropTypes.bool, // set to true if the navigable item is the first left element to prevent focus 'bleeding' to another row if any on 'navigate left' event
    lastCardRight: PropTypes.bool, // set to true if the navigable item is the last right element to prevent focus 'bleeding' to another row if any on 'navigate right' event
    hasTVPreferredFocus: PropTypes.bool, // set to true if the item has the preferred focus in the current screen
    focusKey: PropTypes.string, // unique identifier for the element in the given screen used to record last focused element
    style: PropTypes.object, // optional style to apply to the Touchable wrapper component
};
NavigableCard.defaultProps = {
    onFocus: null,
    firstCardLeft: false,
    lastCardRight: false,
    hasTVPreferredFocus: false,
    focusKey: undefined,
    style: null,
};