/* eslint-disable prettier/prettier */
import React, { Component, useCallback, useEffect, useRef } from 'react';
import Rect from '../models/Rect';
import EPGData from '../utils/EPGData';
import EPGUtils from '../utils/EPGUtils';
import {
  Dimensions,
  Image,
  StyleSheet,
  View,
  TVEventHandler,
} from 'react-native';
import Canvas from 'react-native-canvas';

const paramData = {
  handleClick: null,
  handleScroll: null,
  handleKeyPress: null,
  epgUtils: new EPGUtils(),

  scrollX: 0,
  scrollY: 0,
  focusedChannelPosition: 0,
  focusedEventPosition: -1,
  //state : {translate3d : `translate3d(${scrollX}px, 0px, 0px)`};
  //translate3d : `translate3d(${scrollX}px, 0px, 0px)`;

  mChannelImageCache: new Map(),

  mClipRect: new Rect(),
  mDrawingRect: new Rect(),
  mMeasuringRect: new Rect(),

  mEPGBackground: '#1e1e1e',
  mVisibleChannelCount: 6,
  mChannelLayoutMargin: 3,
  mChannelLayoutPadding: 8,
  mChannelLayoutHeight: 70,
  mChannelLayoutWidth: 70,
  mChannelLayoutBackground: '#323232',

  //mEventLayoutBackground : '#4f4f4f';
  mEventLayoutBackground: '#234054',
  //mEventLayoutBackgroundCurrent : '#4f4f4f';
  mEventLayoutBackgroundCurrent: '#234054',
  mEventLayoutBackgroundFocus: 'rgba(65,182,230,1)',
  mEventLayoutTextColor: '#d6d6d6',
  mEventLayoutTextSize: 20,

  mTimeBarHeight: 30,
  mTimeBarTextSize: 14,
  mTimeBarLineWidth: 2,
  mTimeBarLineColor: '#c57120',

  mResetButtonSize: 40,
  mResetButtonMargin: 10,

  //resetBoundaries();
};

export const DAYS_BACK_MILLIS = 1 * 24 * 60 * 60 * 1000; // 3 days
export const DAYS_FORWARD_MILLIS = 1 * 24 * 60 * 60 * 1000; // 3 days
export const HOURS_IN_VIEWPORT_MILLIS = 2 * 60 * 60 * 1000; // 2 hours
export const TIME_LABEL_SPACING_MILLIS = 30 * 60 * 1000; // 30 minutes

export const VISIBLE_CHANNEL_COUNT = 6; // No of channel to show at a time
export const VERTICAL_SCROLL_BOTTOM_PADDING_ITEM = 2;
export const VERTICAL_SCROLL_TOP_PADDING_ITEM = 2;

const TVGuide = ({ epgData }) => {
  const canvasRe = useRef(null);
  const epgParent = useRef(null);
  const containCanvas = useRef(null);
  const _tvEventHandler = new TVEventHandler();

  const _enableTVEventHandler = () => {
    _tvEventHandler.enable(this, function (cmp, evt) {
      let programPosition = getFocusedEventPosition();
      let channelPosition = getFocusedChannelPosition();
      let dx = 0,
        dy = 0;

      if (evt && evt.eventType === 'right') {
        programPosition += 1;
        if (
          programPosition != -1 &&
          programPosition < epgData.getEventCount(getFocusedChannelPosition())
        ) {
          stateCanvas.focusedEvent = epgData.getEvent(
            getFocusedChannelPosition(),
            programPosition,
          );
          if (stateCanvas.focusedEvent) {
            stateCanvas.focusedEventPosition = programPosition;
            dx = parseInt(
              (stateCanvas.focusedEvent.getEnd() -
                stateCanvas.focusedEvent.getStart()) /
                stateCanvas.mMillisPerPixel,
            );
          }
        }
        stateCanvas.scrollX = getScrollX(false) + dx;
      } else if (evt && evt.eventType === 'up') {
        channelPosition -= 1;
        if (channelPosition >= 0) {
          dy =
            -1 *
            (stateCanvas.mChannelLayoutHeight +
              stateCanvas.mChannelLayoutMargin);
          stateCanvas.focusedEventPosition = getProgramPosition(
            channelPosition,
            getTimeFrom(getScrollX(false) + getWidth() / 2),
          );
          if (
            channelPosition >=
            VISIBLE_CHANNEL_COUNT - VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
          ) {
            if (
              epgData.getChannelCount() - channelPosition !=
              VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
            ) {
              stateCanvas.scrollY = getScrollY(false) + dy;
            }
          }
          console.log(channelPosition);
          stateCanvas.focusedChannelPosition = channelPosition;
        }
      } else if (evt && evt.eventType === 'left') {
        programPosition -= 1;
        if (programPosition != -1 && programPosition > -1) {
          stateCanvas.focusedEvent = epgData.getEvent(
            getFocusedChannelPosition(),
            programPosition,
          );
          if (stateCanvas.focusedEvent) {
            stateCanvas.focusedEventPosition = programPosition;
            dx =
              -1 *
              parseInt(
                (stateCanvas.focusedEvent.getEnd() -
                  stateCanvas.focusedEvent.getStart()) /
                  stateCanvas.mMillisPerPixel,
              );
          }
        }
        stateCanvas.scrollX = getScrollX(false) + dx;
      } else if (evt && evt.eventType === 'down') {
        channelPosition += 1;
        if (channelPosition < epgData.getChannelCount()) {
          dy =
            stateCanvas.mChannelLayoutHeight + stateCanvas.mChannelLayoutMargin;
          stateCanvas.focusedEventPosition = getProgramPosition(
            channelPosition,
            getTimeFrom(getScrollX(false) + getWidth() / 2),
          );

          if (
            channelPosition >
            VISIBLE_CHANNEL_COUNT - VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
          ) {
            if (
              channelPosition !=
              epgData.getChannelCount() - VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
            ) {
              stateCanvas.scrollY = getScrollY(false) + dy;
            }
          }
          console.log(channelPosition);
          stateCanvas.focusedChannelPosition = channelPosition;
        }
      }
      stateCanvas.ctx.clearRect(0, 0, getWidth(), getHeight());
      clear();
      onDraw(stateCanvas.ctx);
    });
  };

  const _disableTVEventHandler = () => {
    if (_tvEventHandler) {
      _tvEventHandler.disable();
    }
  };

  useEffect(() => {
    _enableTVEventHandler();
    return () => _disableTVEventHandler();
  });

  const stateCanvas = paramData;
  const { width, height } = Dimensions.get('window');

  const resetBoundaries = useCallback(() => {
    stateCanvas.mMillisPerPixel = calculateMillisPerPixel();
    stateCanvas.mTimeOffset = calculatedBaseLine();
    stateCanvas.mTimeLowerBoundary = getTimeFrom(0);
    stateCanvas.mTimeUpperBoundary = getTimeFrom(getWidth());
  }, []);

  const calculateMaxHorizontalScroll = useCallback(() => {
    stateCanvas.mMaxHorizontalScroll = parseInt(
      (DAYS_BACK_MILLIS + DAYS_FORWARD_MILLIS - HOURS_IN_VIEWPORT_MILLIS) /
        stateCanvas.mMillisPerPixel,
    );
  }, []);

  const calculateMaxVerticalScroll = useCallback(() => {
    let maxVerticalScroll =
      getTopFrom(epgData.getChannelCount() - 2) +
      stateCanvas.mChannelLayoutHeight;
    stateCanvas.mMaxVerticalScroll =
      maxVerticalScroll < Dimensions.get('window').height
        ? 0
        : maxVerticalScroll - getHeight();
  }, [epgData]);

  const calculateMillisPerPixel = useCallback(() => {
    return (
      HOURS_IN_VIEWPORT_MILLIS /
      (Dimensions.get('window').width -
        stateCanvas.mChannelLayoutWidth -
        stateCanvas.mChannelLayoutMargin)
    );
  }, []);

  const calculatedBaseLine = useCallback(() => {
    //return LocalDateTime.now().toDateTime().minusMillis(DAYS_BACK_MILLIS).getMillis();
    return Date.now() - DAYS_BACK_MILLIS;
  }, []);

  const getProgramPosition = useCallback(
    (channelPosition, time) => {
      let events = epgData.getEvents(channelPosition);
      if (events != null) {
        for (let eventPos = 0; eventPos < events.length; eventPos++) {
          let event = events[eventPos];
          if (event.getStart() <= time && event.getEnd() >= time) {
            return eventPos;
          }
        }
      }
      return -1;
    },
    [epgData],
  );

  const getFirstVisibleChannelPosition = useCallback(() => {
    let y = getScrollY(false);

    let position = parseInt(
      (y - stateCanvas.mChannelLayoutMargin - stateCanvas.mTimeBarHeight) /
        (stateCanvas.mChannelLayoutHeight + stateCanvas.mChannelLayoutMargin),
    );

    if (position < 0) {
      position = 0;
    }
    return position;
  }, []);

  const getLastVisibleChannelPosition = useCallback(() => {
    let y = getScrollY(false);
    let totalChannelCount = epgData.getChannelCount();
    let screenHeight = getHeight();
    let position = parseInt(
      (y +
        screenHeight +
        stateCanvas.mTimeBarHeight -
        stateCanvas.mChannelLayoutMargin) /
        (stateCanvas.mChannelLayoutHeight + stateCanvas.mChannelLayoutMargin),
    );

    if (position > totalChannelCount - 1) {
      position = totalChannelCount - 1;
    }

    // Add one extra row if we don't fill screen with current..
    return y + screenHeight > position * stateCanvas.mChannelLayoutHeight &&
      position < totalChannelCount - 1
      ? position + 1
      : position;
  }, []);

  const getXFrom = useCallback((time) => {
    return parseInt(
      (time - stateCanvas.mTimeLowerBoundary) / stateCanvas.mMillisPerPixel +
        stateCanvas.mChannelLayoutMargin +
        stateCanvas.mChannelLayoutWidth +
        stateCanvas.mChannelLayoutMargin,
    );
  }, []);

  const getTopFrom = useCallback((position) => {
    let y =
      position *
        (stateCanvas.mChannelLayoutHeight + stateCanvas.mChannelLayoutMargin) +
      stateCanvas.mChannelLayoutMargin +
      stateCanvas.mTimeBarHeight;
    return y - getScrollY(false);
  }, []);

  const getXPositionStart = useCallback(() => {
    return getXFrom(Date.now() - HOURS_IN_VIEWPORT_MILLIS / 2);
  }, []);

  const getTimeFrom = useCallback((x) => {
    return x * stateCanvas.mMillisPerPixel + stateCanvas.mTimeOffset;
  }, []);

  const shouldDrawTimeLine = useCallback((now) => {
    return (
      now >= stateCanvas.mTimeLowerBoundary &&
      now < stateCanvas.mTimeUpperBoundary
    );
  }, []);

  const isEventVisible = useCallback((start, end) => {
    return (
      (start >= stateCanvas.mTimeLowerBoundary &&
        start <= stateCanvas.mTimeUpperBoundary) ||
      (end >= stateCanvas.mTimeLowerBoundary &&
        end <= stateCanvas.mTimeUpperBoundary) ||
      (start <= stateCanvas.mTimeLowerBoundary &&
        end >= stateCanvas.mTimeUpperBoundary)
    );
  }, []);

  const getFocusedChannelPosition = useCallback(() => {
    return stateCanvas.focusedChannelPosition;
  }, []);

  const getFocusedEventPosition = useCallback(() => {
    return stateCanvas.focusedEventPosition;
  }, []);

  const isRTL = () => {
    return false;
  };

  const getScrollX = (neglect = true) => {
    if (neglect) {
      return 0;
    }
    return stateCanvas.scrollX;
    //return window.scrollX;
  };

  const getScrollY = (neglect = true) => {
    if (neglect) {
      return 0;
    }
    return stateCanvas.scrollY;
    //return window.scrollY;
  };

  const getWidth = () => {
    return 1280;
  };

  const getHeight = () => {
    return (
      stateCanvas.mTimeBarHeight +
      (stateCanvas.mChannelLayoutMargin + stateCanvas.mChannelLayoutHeight) *
        VISIBLE_CHANNEL_COUNT
    );
  };

  const onDraw = useCallback(
    (canvas) => {
      if (epgData != null && epgData.hasData()) {
        stateCanvas.mTimeLowerBoundary = getTimeFrom(getScrollX(false));
        stateCanvas.mTimeUpperBoundary = getTimeFrom(
          getScrollX(false) + getWidth(),
        );

        let drawingRect = stateCanvas.mDrawingRect;
        //console.log("X:" + this.getScrollX());
        drawingRect.left = getScrollX();
        drawingRect.top = getScrollY();
        drawingRect.right = drawingRect.left + getWidth();
        drawingRect.bottom = drawingRect.top + getHeight();

        drawChannelListItems(canvas, drawingRect);
        drawEvents(canvas, drawingRect);
        drawTimebar(canvas, drawingRect);
        drawTimeLine(canvas, drawingRect);
        //drawResetButton(canvas, drawingRect);
        drawFocusEvent(canvas, drawingRect);
      }
    },
    [epgData, epgData.daata],
  );

  const drawTimebar = useCallback((canvas, drawingRect) => {
    drawingRect.left =
      getScrollX() +
      stateCanvas.mChannelLayoutWidth +
      stateCanvas.mChannelLayoutMargin;
    drawingRect.top = getScrollY();
    drawingRect.right = drawingRect.left + getWidth();
    drawingRect.bottom = drawingRect.top + stateCanvas.mTimeBarHeight;

    stateCanvas.mClipRect.left =
      getScrollX() +
      stateCanvas.mChannelLayoutWidth +
      stateCanvas.mChannelLayoutMargin;
    stateCanvas.mClipRect.top = getScrollY();
    stateCanvas.mClipRect.right = getScrollX() + getWidth();
    stateCanvas.mClipRect.bottom =
      stateCanvas.mClipRect.top + stateCanvas.mTimeBarHeight;

    //canvas.save();
    //canvas.rect(this.mClipRect.left, this.mClipRect.top, this.mClipRect.width, this.mClipRect.height);
    //canvas.clip();

    // Background
    canvas.fillStyle = stateCanvas.mChannelLayoutBackground;
    canvas.fillRect(
      drawingRect.left,
      drawingRect.top,
      drawingRect.width,
      drawingRect.height,
    );

    // Time stamps
    //mPaint.setColor(mEventLayoutTextColor);
    //mPaint.setTextSize(mTimeBarTextSize);
    canvas.fillStyle = stateCanvas.mEventLayoutTextColor;
    if (isRTL()) {
      //canvas.setTransform(1, 0, 0, 1, 0, 0);
      //canvas.save();
      canvas.setTransform(1, 0, 0, 1, 0, 0);
    }

    for (
      let i = 0;
      i < HOURS_IN_VIEWPORT_MILLIS / TIME_LABEL_SPACING_MILLIS;
      i++
    ) {
      // Get time and round to nearest half hour
      let time =
        TIME_LABEL_SPACING_MILLIS *
        ((stateCanvas.mTimeLowerBoundary +
          TIME_LABEL_SPACING_MILLIS * i +
          TIME_LABEL_SPACING_MILLIS / 2) /
          TIME_LABEL_SPACING_MILLIS);

      if (isRTL()) {
        canvas.fillText(
          stateCanvas.epgUtils.getShortTime(time),
          getWidth() +
            stateCanvas.mChannelLayoutMargin +
            stateCanvas.mChannelLayoutMargin -
            stateCanvas.mChannelLayoutHeight -
            getXFrom(time),
          drawingRect.top +
            ((drawingRect.bottom - drawingRect.top) / 2 +
              stateCanvas.mTimeBarTextSize / 2),
        );
      } else {
        canvas.fillText(
          stateCanvas.epgUtils.getShortTime(time),
          getXFrom(time),
          drawingRect.top +
            ((drawingRect.bottom - drawingRect.top) / 2 +
              stateCanvas.mTimeBarTextSize / 2),
        );
      }
    }
    if (isRTL()) {
      stateCanvas.ctx.setTransform(-1, -0, 0, 1, getWidth(), 0);
      //canvas.restore();ZZ
    }

    //canvas.restore();

    drawTimebarDayIndicator(canvas, drawingRect);
    drawTimebarBottomStroke(canvas, drawingRect);
  }, []);

  const drawTimebarDayIndicator = (canvas, drawingRect) => {
    drawingRect.left = getScrollX();
    drawingRect.top = getScrollY();
    drawingRect.right = drawingRect.left + stateCanvas.mChannelLayoutWidth;
    drawingRect.bottom = drawingRect.top + stateCanvas.mTimeBarHeight;

    // Background
    //mPaint.setColor(mChannelLayoutBackground);
    canvas.fillStyle = stateCanvas.mChannelLayoutBackground;
    //canvas.drawRect(drawingRect, mPaint);
    canvas.fillRect(
      drawingRect.left,
      drawingRect.top,
      drawingRect.width,
      drawingRect.height,
    );

    // Text
    //mPaint.setColor(mEventLayoutTextColor);
    canvas.fillStyle = stateCanvas.mEventLayoutTextColor;
    //mPaint.setTextSize(mTimeBarTextSize);
    //mPaint.setTextAlign(Paint.Align.CENTER);
    canvas.textAlign = 'center';
    //canvas.drawText(EPGUtil.getWeekdayName(mTimeLowerBoundary),
    //drawingRect.left + ((drawingRect.right - drawingRect.left) / 2),
    //drawingRect.top + (((drawingRect.bottom - drawingRect.top) / 2) + (mTimeBarTextSize / 2)), mPaint);
    if (isRTL()) {
      //canvas.save();
      canvas.setTransform(1, 0, 0, 1, 0, 0);
      //canvas.scale(-1, 1);

      canvas.fillText(
        stateCanvas.epgUtils.getWeekdayName(stateCanvas.mTimeLowerBoundary),
        getWidth() +
          stateCanvas.mChannelLayoutMargin +
          stateCanvas.mChannelLayoutMargin -
          stateCanvas.mChannelLayoutHeight -
          drawingRect.left +
          (drawingRect.right - drawingRect.left) / 2,
        drawingRect.top +
          ((drawingRect.bottom - drawingRect.top) / 2 +
            stateCanvas.mTimeBarTextSize / 2),
      );
    } else {
      canvas.fillText(
        stateCanvas.epgUtils.getWeekdayName(stateCanvas.mTimeLowerBoundary),
        drawingRect.left + (drawingRect.right - drawingRect.left) / 2,
        drawingRect.top +
          ((drawingRect.bottom - drawingRect.top) / 2 +
            stateCanvas.mTimeBarTextSize / 2),
      );
    }

    if (isRTL()) {
      stateCanvas.ctx.setTransform(-1, -0, 0, 1, getWidth(), 0);
    }

    //mPaint.setTextAlign(Paint.Align.LEFT);
    canvas.textAlign = 'left';
  };

  const drawTimebarBottomStroke = (canvas, drawingRect) => {
    drawingRect.left = getScrollX();
    drawingRect.top = getScrollY() + stateCanvas.mTimeBarHeight;
    drawingRect.right = drawingRect.left + getWidth();
    drawingRect.bottom = drawingRect.top + stateCanvas.mChannelLayoutMargin;

    // Bottom stroke
    //mPaint.setColor(mEPGBackground);
    canvas.fillStyle = stateCanvas.mEPGBackground;
    canvas.fillRect(
      drawingRect.left,
      drawingRect.top,
      drawingRect.width,
      drawingRect.height,
    );
  };

  const drawTimeLine = (canvas, drawingRect) => {
    let now = Date.now();
    if (shouldDrawTimeLine(now)) {
      drawingRect.left = getXFrom(now);
      drawingRect.top = getScrollY();
      drawingRect.right = drawingRect.left + stateCanvas.mTimeBarLineWidth;
      drawingRect.bottom = drawingRect.top + getHeight();

      //mPaint.setColor(mTimeBarLineColor);
      canvas.fillStyle = stateCanvas.mTimeBarLineColor;
      //canvas.drawRect(drawingRect, mPaint);
      canvas.fillRect(
        drawingRect.left,
        drawingRect.top,
        drawingRect.width,
        drawingRect.height,
      );
    }
  };

  const drawEvents = (canvas, drawingRect) => {
    let firstPos = getFirstVisibleChannelPosition();
    let lastPos = getLastVisibleChannelPosition();

    //console.log ("First: " + firstPos + " Last: " + lastPos);

    for (let pos = firstPos; pos <= lastPos; pos++) {
      // Set clip rectangle
      stateCanvas.mClipRect.left =
        getScrollX() +
        stateCanvas.mChannelLayoutWidth +
        stateCanvas.mChannelLayoutMargin;
      stateCanvas.mClipRect.top = getTopFrom(pos);
      stateCanvas.mClipRect.right = getScrollX() + getWidth();
      stateCanvas.mClipRect.bottom =
        stateCanvas.mClipRect.top + stateCanvas.mChannelLayoutHeight;

      //canvas.save();
      //canvas.rect(this.mClipRect.left, this.mClipRect.top, this.mClipRect.width, this.mClipRect.height);
      //canvas.clip();

      // Draw each event
      let foundFirst = false;

      let epgEvents = epgData.getEvents(pos);
      if (isRTL()) {
        //canvas.setTransform(1, 0, 0, 1, 0, 0);
        //canvas.textAlign = "right";
      }

      for (let event of epgEvents) {
        if (isEventVisible(event.getStart(), event.getEnd())) {
          drawEvent(canvas, pos, event, drawingRect);
          foundFirst = true;
        } else if (foundFirst) {
          break;
        }
      }

      if (isRTL()) {
        //this.ctx.setTransform(-1, -0, 0, 1, this.getWidth(), 0);
      }

      //canvas.restore();
    }
  };

  const drawEvent = (canvas, channelPosition, event, drawingRect) => {
    setEventDrawingRectangle(
      channelPosition,
      event.getStart(),
      event.getEnd(),
      drawingRect,
    );

    // Background
    //mPaint.setColor(event.isCurrent() ? mEventLayoutBackgroundCurrent : mEventLayoutBackground);
    canvas.fillStyle = event.isCurrent()
      ? stateCanvas.mEventLayoutBackgroundCurrent
      : stateCanvas.mEventLayoutBackground;
    if (channelPosition == getFocusedChannelPosition()) {
      let focusedEventPosition = getFocusedEventPosition();
      if (focusedEventPosition != -1) {
        let focusedEvent = epgData.getEvent(
          channelPosition,
          focusedEventPosition,
        );
        if (focusedEvent == event) {
          canvas.fillStyle = stateCanvas.mEventLayoutBackgroundFocus;
        }
      } else if (event.isCurrent()) {
        stateCanvas.focusedEventPosition = epgData.getEventPosition(
          channelPosition,
          event,
        );
        canvas.fillStyle = stateCanvas.mEventLayoutBackgroundFocus;
      }
    }
    //canvas.drawRect(drawingRect, mPaint);
    // if Clip is not working properly, hack
    if (
      drawingRect.left <
      getScrollX() +
        stateCanvas.mChannelLayoutWidth +
        stateCanvas.mChannelLayoutMargin
    ) {
      drawingRect.left =
        getScrollX() +
        stateCanvas.mChannelLayoutWidth +
        stateCanvas.mChannelLayoutMargin;
    }
    canvas.fillRect(
      drawingRect.left,
      drawingRect.top,
      drawingRect.width,
      drawingRect.height,
    );

    // Add left and right inner padding
    drawingRect.left += stateCanvas.mChannelLayoutPadding;
    drawingRect.right -= stateCanvas.mChannelLayoutPadding;

    // Text
    //mPaint.setColor(mEventLayoutTextColor);
    canvas.fillStyle = stateCanvas.mEventLayoutTextColor;
    //mPaint.setTextSize(mEventLayoutTextSize);
    canvas.font = '20px Arial';

    // Move drawing.top so text will be centered (text is drawn bottom>up)
    //mPaint.getTextBounds(event.getTitle(), 0, event.getTitle().length(), mMeasuringRect);
    drawingRect.top += (drawingRect.bottom - drawingRect.top) / 2 + 10 / 2;

    let title = event.getTitle();
    /*title = title.substring(0,
         mPaint.breakText(title, true, drawingRect.right - drawingRect.left, null));*/
    if (isRTL()) {
      //canvas.setTransform(1, 0, 0, 1, 0, 0);
      //canvas.fillText(title, (this.getWidth() + this.mChannelLayoutMargin + this.mChannelLayoutMargin - this.mChannelLayoutHeight) - drawingRect.left, drawingRect.top);
      //canvas.scale(1, -1);
      console.log('LEFT :' + drawingRect.left);
      canvas.fillText(title, drawingRect.left, drawingRect.top);
      //canvas.setTransform(-1, -0, 0, 1, this.getWidth(), 0);
      //canvas.textAlign = "right";
    } else {
      canvas.fillText(title, drawingRect.left, drawingRect.top);
    }
  };

  const setEventDrawingRectangle = (
    channelPosition,
    start,
    end,
    drawingRect,
  ) => {
    drawingRect.left = getXFrom(start);
    drawingRect.top = getTopFrom(channelPosition);
    drawingRect.right = getXFrom(end) - stateCanvas.mChannelLayoutMargin;
    drawingRect.bottom = drawingRect.top + stateCanvas.mChannelLayoutHeight;

    return drawingRect;
  };

  const drawChannelListItems = (canvas, drawingRect) => {
    // Background
    stateCanvas.mMeasuringRect.left = getScrollX();
    stateCanvas.mMeasuringRect.top = getScrollY();
    stateCanvas.mMeasuringRect.right =
      drawingRect.left + stateCanvas.mChannelLayoutWidth;
    stateCanvas.mMeasuringRect.bottom =
      stateCanvas.mMeasuringRect.top + getHeight();

    //mPaint.setColor(mChannelLayoutBackground);
    canvas.fillStyle = stateCanvas.mChannelLayoutBackground;
    canvas.fillRect(
      stateCanvas.mMeasuringRect.left,
      stateCanvas.mMeasuringRect.top,
      stateCanvas.mMeasuringRect.width,
      stateCanvas.mMeasuringRect.height,
    );

    let firstPos = getFirstVisibleChannelPosition();
    let lastPos = getLastVisibleChannelPosition();

    for (let pos = firstPos; pos <= lastPos; pos++) {
      drawChannelItem(canvas, pos, drawingRect);
    }
  };

  const drawChannelItem = (canvas, position, drawingRect) => {
    drawingRect.left = getScrollX();
    drawingRect.top = getTopFrom(position);
    drawingRect.right = drawingRect.left + stateCanvas.mChannelLayoutWidth;
    drawingRect.bottom = drawingRect.top + stateCanvas.mChannelLayoutHeight;

    // Loading channel image into target for
    let imageURL = epgData.getChannel(position).getImageURL();

    if (stateCanvas.mChannelImageCache.has(imageURL)) {
      let image = stateCanvas.mChannelImageCache.get(imageURL);
      drawingRect = getDrawingRectForChannelImage(drawingRect, image);
      //canvas.drawBitmap(image, null, drawingRect, null);
      if (this.isRTL()) {
        canvas.setTransform(1, 0, 0, 1, 0, 0);
        canvas.drawImage(
          image,
          getWidth() +
            4 * stateCanvas.mChannelLayoutMargin -
            stateCanvas.mChannelLayoutWidth -
            drawingRect.left,
          drawingRect.top,
          drawingRect.width,
          drawingRect.height,
        );
        canvas.setTransform(-1, -0, 0, 1, getWidth(), 0);
      } else {
        canvas.drawImage(
          image,
          drawingRect.left,
          drawingRect.top,
          drawingRect.width,
          drawingRect.height,
        );
      }
    } else {
      const img = () => <Image source={imageURL} />;
      let that = stateCanvas;
      img.onload = function () {
        stateCanvas.mChannelImageCache.set(imageURL, img);
        updateCanvas();
        //drawingRect = that.getDrawingRectForChannelImage(drawingRect, img);
        //canvas.drawBitmap(image, null, drawingRect, null);
        //canvas.drawImage(img, drawingRect.left, drawingRect.top, drawingRect.width, drawingRect.height);
      };
    }
  };

  const getDrawingRectForChannelImage = (drawingRect, image) => {
    drawingRect.left += stateCanvas.mChannelLayoutPadding;
    drawingRect.top += stateCanvas.mChannelLayoutPadding;
    drawingRect.right -= stateCanvas.mChannelLayoutPadding;
    drawingRect.bottom -= stateCanvas.mChannelLayoutPadding;

    let imageWidth = image.width;
    let imageHeight = image.height;
    let imageRatio = imageHeight / parseFloat(imageWidth);

    let rectWidth = drawingRect.right - drawingRect.left;
    let rectHeight = drawingRect.bottom - drawingRect.top;

    // Keep aspect ratio.
    if (imageWidth > imageHeight) {
      let padding = parseInt((rectHeight - rectWidth * imageRatio) / 2);
      drawingRect.top += padding;
      drawingRect.bottom -= padding;
    } else if (imageWidth <= imageHeight) {
      let padding = parseInt((rectWidth - rectHeight / imageRatio) / 2);
      drawingRect.left += padding;
      drawingRect.right -= padding;
    }

    return drawingRect;
  };

  const drawFocusEvent = (canvas, drawingRect) => {};

  const handleClick = (event) => {
    stateCanvas.scrollX =
      getScrollX(false) +
      parseInt(TVGuide.TIME_LABEL_SPACING_MILLIS / stateCanvas.mMillisPerPixel);
    //this.scroller.scrollTo(this.scrollX, this.scrollY);
    //window.scrollTo(this.scrollX, this.scrollY);

    //this.ctx.fillStyle = 'red';
    stateCanvas.ctx.clearRect(0, 0, getWidth(), getHeight());
    clear();
    onDraw(stateCanvas.ctx);
    //this.updateCanvas();
  };

  const clear = () => {
    stateCanvas.mClipRect = new Rect();
    stateCanvas.mDrawingRect = new Rect();
    stateCanvas.mMeasuringRect = new Rect();
  };

  const recalculateAndRedraw = useCallback(() => {
    if (epgData != null && epgData.hasData()) {
      resetBoundaries();

      calculateMaxVerticalScroll();
      calculateMaxHorizontalScroll();

      stateCanvas.scrollX = getScrollX() + getXPositionStart() - getScrollX();
      stateCanvas.scrollY = getScrollY();
      stateCanvas.scroller = containCanvas.current;
      updateCanvas();
    }
  }, [
    epgData.data,
    epgData,
    resetBoundaries,
    calculateMaxVerticalScroll,
    calculateMaxHorizontalScroll,
    getScrollY,
    getXPositionStart,
    getScrollX,
    updateCanvas,
  ]);

  const handleScroll = () => {
    console.log('scrolling...');
  };

  const handleKeyPress = (event) => {
    let keyCode = event.keyCode;
    /*keyCode = this.isRTL() && (keyCode == 39) ? 37 : 39;
        keyCode = this.isRTL() && (keyCode == 37) ? 39 : 37;*/
    let programPosition = getFocusedEventPosition();
    let channelPosition = getFocusedChannelPosition();
    let dx = 0,
      dy = 0;
    switch (event) {
      case 'right':
        //let programPosition = this.getProgramPosition(this.getFocusedChannelPosition(), this.getTimeFrom(this.getScrollX(false) ));
        programPosition += 1;
        if (
          programPosition != -1 &&
          programPosition < epgData.getEventCount(getFocusedChannelPosition())
        ) {
          stateCanvas.focusedEvent = epgData.getEvent(
            getFocusedChannelPosition(),
            programPosition,
          );
          if (stateCanvas.focusedEvent) {
            stateCanvas.focusedEventPosition = programPosition;
            dx = parseInt(
              (stateCanvas.focusedEvent.getEnd() -
                stateCanvas.focusedEvent.getStart()) /
                stateCanvas.mMillisPerPixel,
            );
          }
        }
        stateCanvas.scrollX = getScrollX(false) + dx;
        break;
      case 'left':
        programPosition -= 1;
        if (programPosition != -1 && programPosition > -1) {
          stateCanvas.focusedEvent = epgData.getEvent(
            getFocusedChannelPosition(),
            programPosition,
          );
          if (stateCanvas.focusedEvent) {
            stateCanvas.focusedEventPosition = programPosition;
            dx =
              -1 *
              parseInt(
                (stateCanvas.focusedEvent.getEnd() -
                  stateCanvas.focusedEvent.getStart()) /
                  stateCanvas.mMillisPerPixel,
              );
          }
        }
        stateCanvas.scrollX = getScrollX(false) + dx;
        break;
      case 'down':
        channelPosition += 1;
        if (channelPosition < epgData.getChannelCount()) {
          dy =
            stateCanvas.mChannelLayoutHeight + stateCanvas.mChannelLayoutMargin;
          stateCanvas.focusedEventPosition = getProgramPosition(
            channelPosition,
            getTimeFrom(getScrollX(false) + getWidth() / 2),
          );

          if (
            channelPosition >
            VISIBLE_CHANNEL_COUNT - VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
          ) {
            if (
              channelPosition !=
              epgData.getChannelCount() - VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
            ) {
              stateCanvas.scrollY = getScrollY(false) + dy;
            }
          }
          console.log(channelPosition);
          stateCanvas.focusedChannelPosition = channelPosition;
        }
        break;
      case 'up':
        channelPosition -= 1;
        if (channelPosition >= 0) {
          dy =
            -1 *
            (stateCanvas.mChannelLayoutHeight +
              stateCanvas.mChannelLayoutMargin);
          stateCanvas.focusedEventPosition = getProgramPosition(
            channelPosition,
            getTimeFrom(getScrollX(false) + getWidth() / 2),
          );
          if (
            channelPosition >=
            VISIBLE_CHANNEL_COUNT - VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
          ) {
            if (
              epgData.getChannelCount() - channelPosition !=
              VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
            ) {
              stateCanvas.scrollY = getScrollY(false) + dy;
            }
          }
          console.log(channelPosition);
          stateCanvas.focusedChannelPosition = channelPosition;
        }
        break;
    }

    stateCanvas.ctx.clearRect(0, 0, getWidth(), getHeight());
    clear();
    onDraw(stateCanvas.ctx);
  };

  useEffect(() => {
    recalculateAndRedraw(false);
    focusEPG();
  }, [focusEPG, recalculateAndRedraw]);

  useEffect(() => {
    if (canvasRe.current) {
      canvasRe.current.width = width;
      canvasRe.current.height = height;
      console.log(width, height);
      updateCanvas();
    }
  }, [updateCanvas]);

  const updateCanvas = useCallback(() => {
    stateCanvas.ctx = canvasRe.current.getContext('2d');
    if (isRTL()) {
      //this.ctx.scale(-1,1);
      //this.ctx.translate(this.getWidth(), 0);
      stateCanvas.ctx.setTransform(-1, -0, 0, 1, getWidth(), 0);
      //this.ctx.setTransform(-1,-0,0,1,this.getWidth(),0);

      // WORKING
      /*this.ctx.setTransform(1,0,0,1,0,0);
            this.ctx.translate(this.getWidth(),0);
            this.ctx.scale(-1,1);*/
      //console.log(this.ctx.currentTransform);
      //this.ctx.rotate(360*Math.PI/180);
      //console.log(this.ctx.currentTransform);
    }
    // draw children “components”
    onDraw(stateCanvas.ctx);
  }, [onDraw, stateCanvas]);

  const focusEPG = useCallback(() => {
    epgParent.current.focus();
  }, []);

  return (
    <View
      id="wrapper"
      style={{ width: '100%', height: '100%' }}
      ref={epgParent}
      onKeyDown={handleKeyPress}
      className={Styles.background}
    >
      <View
        ref={containCanvas}
        style={{ width: '100%', backgroundColor: 'green', height: '100%' }}
      >
        <Canvas
          ref={canvasRe}
          width={getWidth()}
          height={getHeight()}
          style={{ border: 1 }}
        />
      </View>
    </View>
  );
};

const Styles = StyleSheet.create({
  background: {
    backgroundColor: '#0f0',
    flex: 1,
    elevation: 1,
    position: 'absolute',
    width: 1280,
    maxHeight: 720,
    top: 20,
    left: 20,
    right: 'initial',
    opacity: 0.99,
  },
});

export default TVGuide;
