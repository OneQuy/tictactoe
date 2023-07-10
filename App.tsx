// https://console.firebase.google.com/u/0/project/tictactoe-d4149/database

import { Animated, Keyboard, TextInput, TouchableOpacity, StyleSheet, FlatList, View, Text, Button, ActivityIndicator, Alert } from 'react-native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CommonStyle, Constants, windowSize } from './Src/Constants';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import SelectDropdown from 'react-native-select-dropdown'
import { FirebaseInit } from './Src/Common/Firebase/Firebase';
import { FirebaseDatabase_OnValue, FirebaseDatabase_GetValueAsync, FirebaseDatabase_SetValueAsync } from './Src/Common/Firebase/FirebaseDatabase';
import Clipboard from '@react-native-clipboard/clipboard';

const CELL_MARGIN = 2;
const HORIZONTAL_MARGIN = Constants.marginPercentWidth_a;
const MAX_COUNT_WIN = 5;
const WIN_TEXT_COLOR = '#fc6812';
const MAIN_COLOR = '#6cc94d';
const CELL_COUNT_DROPDOWN_VALUES = [3, 4, 5, 6, 7, 8, 9, 10];

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

type CellContent = 'x' | 'o' | '';
type TeamType = Exclude<CellContent, ''>;

type TurnData = {
  type: TeamType,
  cellIndex: number,
}

type RoomData = {
  code: string,
  friendJoinedRoom: boolean,
  isWon: boolean,
  cellCount: number,
  currentTurn: TurnData,
}

enum State {
  StartScreen,
  CreateNewGame,
  SetupNewRoom,
  JoinRoom,
  Playing,
}

enum MultiDeviceMode {
  OneDevice,
  TwoDevice
}

const Game = () => {
  // app states

  const [keyboardShowed, setKeyboardShowed] = useState<boolean>(false);
  const [isHandling, setIsHandling] = useState<boolean>(false);

  // anim

  const animVal1 = useRef(new Animated.Value(0)).current;
  const animVal2 = useRef(new Animated.Value(0)).current;
  const animVal3 = useRef(new Animated.Value(0)).current;

  // game states

  const [turnData, setTurnData] = useState<TurnData | null>(null);
  const [cellCount, setCellCount] = useState<number>(7);
  const [multiDeviceMode, setMultiDevicerMode] = useState<MultiDeviceMode>(MultiDeviceMode.OneDevice);
  const [state, setState] = useState<State>(State.StartScreen);
  const [cells, setCells] = useState<CellContent[]>([]);
  const [lastPressedCell, setLastPressedCell] = useState<[number, number] | null>(null);
  const [currentTurn, setCurrentTurn] = useState<TeamType>('x');
  const [winCellIdxs, setWinCellIdxs] = useState<number[] | null>(null);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [joinRoomCode, setJoinRoomCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [shouldStartGame, setShouldStartGame] = useState<boolean>(false);
  const [userInputCode, setUserInputCode] = useState<string>('');
  const unsubscribeWaitingJoinRoom = useRef<(() => void) | null>(null);
  const unsubscribePlayingState = useRef<(() => void) | null>(null);
  const myTeamType = useRef<TeamType>('x');

  // setups

  const maxCountWin = Math.min(cellCount, MAX_COUNT_WIN);

  const cellSize = useMemo(() =>
    (windowSize.width - HORIZONTAL_MARGIN * 2 - (cellCount - 1) * (CELL_MARGIN * 2)) / cellCount
    , [cellCount]);

  const isMultiDevicesAndFriendTurn = multiDeviceMode === MultiDeviceMode.TwoDevice && currentTurn !== myTeamType.current;
  const disableCellsInteraction = isWon || isMultiDevicesAndFriendTurn;

  // renders & references

  // console.log('cells....', cells);

  const onPressCell = useCallback((index: number, isMe: boolean) => {
    if (cells[index] !== '') {
      console.warn('cells[index]', cells[index], cells);
      return;
    }
    const turn = currentTurn;
    cells[index] = turn;
    setCells([...cells]);
    setLastPressedCell(indexToArrayIndex(index, cellCount));

    const nextTurn: TeamType = turn === 'x' ? 'o' : 'x';
    setCurrentTurn(nextTurn);
    // console.log('on pressCell', index, turn, nextTurn, 'isMe:' + isMe, multiDeviceMode === MultiDeviceMode.TwoDevice ? 'TwoPlayer' : 'OnePlayer');

    if (isMe && multiDeviceMode === MultiDeviceMode.TwoDevice) {
      FirebaseDatabase_SetValueAsync(
        roomFirebaseRLP(joinRoomCode) + '/currentTurn',
        { type: turn, cellIndex: index } as TurnData);
    }
  }, [cells, cellCount, currentTurn, joinRoomCode, multiDeviceMode]);

  const renderCell = useCallback(({ item, index }: { item: CellContent, index: number }) => {
    return <Cell
      item={item}
      index={index}
      winCellIdxs={winCellIdxs}
      onPressCell={onPressCell}
      isWon={isWon}
      cellSize={cellSize}
      isMultiDevicesAndFriendTurn={isMultiDevicesAndFriendTurn}
    />
  }, [cellSize, winCellIdxs, onPressCell]);

  // functions  

  const onTurnDataChanged = useCallback((turnData: TurnData) => {
    if (!turnData || turnData.type === myTeamType.current)
      return;

    if (turnData.cellIndex == -2) { //opponent gave up
      Alert.alert('You are the winner!', 'Your opponent gave up.',
        [
          {
            text: 'Back Home',
            onPress: () => onPressBackHome_PlayingScreen(false),
          }
        ]);

      return;
    }

    if (turnData.cellIndex >= 0) {
      console.log('changed turn data & call pressCell', turnData);

      onPressCell(turnData.cellIndex, false);
    }
  }, [cells, onPressCell]);

  const onWinGame = useCallback((winCellsIdx: number[]) => {
    setWinCellIdxs(winCellsIdx);
    setIsWon(true);
  }, []);

  const onSetupNewRoom = useCallback(async () => {
    setState(State.SetupNewRoom);

    let rand = Math.random();
    let code = rand.toString(36);
    code = code.substring(2, 6).toUpperCase();

    const res = await FirebaseDatabase_SetValueAsync(roomFirebaseRLP(code), {
      code,
      friendJoinedRoom: false,
      isWon: false,
      cellCount,
      currentTurn: { type: 'x', cellIndex: -1 },
    } as RoomData);

    if (res) { // error
      Alert.alert('Error When Setup Room', String(res));
      console.error(res);
      return;
    }

    setJoinRoomCode(code);

    console.log('subcribe unsubscribeWaitingJoinRoom');
    unsubscribeWaitingJoinRoom.current = FirebaseDatabase_OnValue(roomFirebaseRLP(code) + '/friendJoinedRoom', (val: boolean) => {
      if (val === true) { // friend entered room
        setShouldStartGame(true);
      }
    });
  }, [cellCount]);

  // button handles

  const onPressNewGame_StartScreen = useCallback(() => {
    playAnimStartScreen(false, () => {
      setState(State.CreateNewGame);
    });
  }, []);

  const onPressJoinRoom_StartScreen = useCallback(() => {
    playAnimStartScreen(false, () => {
      setMultiDevicerMode(MultiDeviceMode.TwoDevice);
      setState(State.JoinRoom);
    });
  }, []);

  const onPressReset_PlayingScreen = useCallback(() => {
    setShouldStartGame(true);
  }, []);

  const onPressBackHome_PlayingScreen = useCallback((askConfirm: boolean) => {
    const quit = () => {
      if (multiDeviceMode === MultiDeviceMode.TwoDevice) {
        FirebaseDatabase_SetValueAsync(
          roomFirebaseRLP(joinRoomCode) + '/currentTurn',
          { type: myTeamType.current, cellIndex: -2 } as TurnData);
      }

      if (unsubscribePlayingState.current) {
        unsubscribePlayingState.current();
        unsubscribePlayingState.current = null;
        console.log('unsubcribe unsubscribePlayingState');
      }
      
      setState(State.StartScreen);
    }

    if (askConfirm) {
      Alert.alert(
        'Confirm',
        'You want to stop and back to Home?',
        [
          {
            text: 'No',
            style: 'cancel',
          },
          {
            text: 'Yes',
            onPress: quit,
          }
        ]);
    }
    else
      quit();
  }, [multiDeviceMode, joinRoomCode]);

  const onPressDeviceMode_CreateNewGameScreen = useCallback((is1Device: boolean) => {
    playAnimNewGameScreen(false, () => {
      setMultiDevicerMode(is1Device ? MultiDeviceMode.OneDevice : MultiDeviceMode.TwoDevice);

      if (is1Device)
        setShouldStartGame(true);
      else
        onSetupNewRoom();
    });
  }, [onSetupNewRoom]);

  const onPressCopyCode_CreateNewRoomScreen = useCallback(() => {
    Clipboard.setString(joinRoomCode);
    setCopiedCode(true);
  }, [joinRoomCode]);

  const onPressBackHome = useCallback((fromState: State) => {
    Alert.alert(
      'Confirm',
      'You want to cancel and back to Home?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: () => {
            if (fromState === State.CreateNewGame)
              playAnimNewGameScreen(false, () => setState(State.StartScreen));
            else if (fromState === State.JoinRoom)
              playAnimJoinRoomScreen(false, () => setState(State.StartScreen));
            else if (fromState === State.SetupNewRoom)
              playAnimSetupNewRoomScreen(false, () => setState(State.StartScreen));
            else
              setState(State.StartScreen)
          },
        }
      ]);
  }, []);

  const onPressJoin_JoinRoomScreen = useCallback(async (isSilent: boolean, code?: string) => {
    setIsHandling(true);
    code = code ? code : userInputCode;

    let res = await FirebaseDatabase_GetValueAsync(roomFirebaseRLP(code));

    if (res.error) {
      setIsHandling(false);

      if (!isSilent) {
        Alert.alert('Error When Enter Room', String(res.error));
        console.error(res);
      }

      return;
    }

    if (res.value === null) {
      setIsHandling(false);

      if (!isSilent) {
        Alert.alert('Room not available!', `Room ${code} not found.`);
      }
      return;
    }

    let roomData = res.value as RoomData;

    if (roomData.friendJoinedRoom) {
      setIsHandling(false);

      if (!isSilent) {
        Alert.alert('Room is full!', 'Let enter another room!');
      }
      return;
    }

    // start join

    const resSetJoined = await FirebaseDatabase_SetValueAsync(roomFirebaseRLP(code) + '/friendJoinedRoom', true);

    if (resSetJoined) { // error
      setIsHandling(false);

      if (!isSilent) {
        Alert.alert('Error When Join Room', String(res));
        console.error(res);
      }

      return;
    }

    // join!

    myTeamType.current = 'o';

    playAnimJoinRoomScreen(false, () => {
      setIsHandling(false);
      setJoinRoomCode(roomData.code);
      setCellCount(roomData.cellCount);
      setShouldStartGame(true);
    });
  }, [userInputCode]);

  const onEnteringJoinCode = useCallback((text: string) => {
    text = text.trim().toUpperCase();
    setUserInputCode(text);

    if (text.length === 4) {
      onPressJoin_JoinRoomScreen(true, text);
    }
  }, [onPressJoin_JoinRoomScreen]);

  // anim 

  const playAnimStartScreen = useCallback((isEntering: boolean, cbOnFinish?: () => void) => {
    if (isEntering) {
      animVal1.resetAnimation();
      animVal2.resetAnimation();
      animVal3.resetAnimation();

      Animated.parallel([
        Animated.spring(animVal1, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(animVal2, {
          toValue: 1,
          useNativeDriver: true,
          delay: 100,
        }),
        Animated.spring(animVal3, {
          toValue: 1,
          useNativeDriver: true,
          delay: 200,
        }),
      ]).start();
    }
    else { // exiting               
      Animated.parallel([
        Animated.timing(animVal1, {
          duration: 200,
          toValue: 0,
          useNativeDriver: true,
          delay: 200,
        }),
        Animated.timing(animVal2, {
          duration: 200,
          toValue: 0,
          useNativeDriver: true,
          delay: 100,
        }),
        Animated.timing(animVal3, {
          duration: 200,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start(cbOnFinish);
    }
  }, []);

  const playAnimNewGameScreen = useCallback((isEntering: boolean, cbOnFinish?: () => void) => {
    if (isEntering) {
      animVal1.setValue(wp('100%'));
      animVal2.setValue(wp('100%'));
      animVal3.setValue(wp('100%'));

      Animated.parallel([
        Animated.spring(animVal1, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(animVal2, {
          toValue: 0,
          useNativeDriver: true,
          delay: 100,
        }),
        Animated.spring(animVal3, {
          toValue: 0,
          useNativeDriver: true,
          delay: 200,
        }),
      ]).start();
    }
    else { // exiting         
      const target = wp('100%');

      Animated.parallel([
        Animated.timing(animVal1, {
          duration: 200,
          toValue: target,
          useNativeDriver: true,
          delay: 200,
        }),
        Animated.timing(animVal2, {
          duration: 200,
          toValue: target,
          useNativeDriver: true,
          delay: 100,
        }),
        Animated.timing(animVal3, {
          duration: 200,
          toValue: target,
          useNativeDriver: true,
        }),
      ]).start(cbOnFinish);
    }
  }, []);

  const playAnimJoinRoomScreen = useCallback((isEntering: boolean, cbOnFinish?: () => void) => {
    const startPoint = -wp('100%');

    if (isEntering) {
      animVal1.setValue(startPoint);
      animVal2.setValue(startPoint);
      animVal3.setValue(startPoint);

      Animated.parallel([
        Animated.spring(animVal1, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(animVal2, {
          toValue: 0,
          useNativeDriver: true,
          delay: 100,
        }),
        Animated.spring(animVal3, {
          toValue: 0,
          useNativeDriver: true,
          delay: 200,
        }),
      ]).start();
    }
    else { // exiting              
      Animated.parallel([
        Animated.timing(animVal1, {
          duration: 200,
          toValue: startPoint,
          useNativeDriver: true,
          delay: 200,
        }),
        Animated.timing(animVal2, {
          duration: 200,
          toValue: startPoint,
          useNativeDriver: true,
          delay: 100,
        }),
        Animated.timing(animVal3, {
          duration: 200,
          toValue: startPoint,
          useNativeDriver: true,
        }),
      ]).start(cbOnFinish);
    }
  }, []);

  const playAnimSetupNewRoomScreen = useCallback((isEntering: boolean, cbOnFinish?: () => void) => {
    const startPoint = 0;

    if (isEntering) {
      animVal1.setValue(startPoint);
      animVal2.setValue(startPoint);
      animVal3.setValue(startPoint);

      Animated.parallel([
        Animated.spring(animVal1, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(animVal2, {
          toValue: 1,
          useNativeDriver: true,
          delay: 100,
        }),
      ]).start();
    }
    else { // exiting              
      Animated.parallel([
        Animated.timing(animVal1, {
          duration: 200,
          toValue: startPoint,
          useNativeDriver: true,
          delay: 100,
        }),
        Animated.timing(animVal2, {
          duration: 200,
          toValue: startPoint,
          useNativeDriver: true,
        }),
      ]).start(cbOnFinish);
    }
  }, []);

  // effect - check start game

  useEffect(() => {
    if (!shouldStartGame)
      return;

    let num = cellCount;
    var arr = Array.from(Array(num * num)).map(_ => '' as CellContent);
    setCells([...arr]);
    setLastPressedCell(null);
    setWinCellIdxs(null);
    setIsWon(false);
    setState(State.Playing);
    setShouldStartGame(false);

    console.log('------------------------------------');

    if (multiDeviceMode === MultiDeviceMode.TwoDevice) {
      if (unsubscribePlayingState.current) {
        console.warn('need to unsub first');
      }

      unsubscribePlayingState.current = FirebaseDatabase_OnValue(
        roomFirebaseRLP(joinRoomCode) + '/currentTurn',
        (val: TurnData) => { setTurnData(val); });

      console.log('start listening state from firebase, joinRoomCode:', joinRoomCode);
    }
    // else
    // console.log('1 player so NOT listening firebase');
  }, [shouldStartGame]);

  // effect - update move

  useEffect(() => {
    if (turnData === null)
      return;

    onTurnDataChanged(turnData);
    setTurnData(null);
  }, [turnData]);

  // effect - check win

  useEffect(() => {
    if (lastPressedCell === null || state !== State.Playing)
      return;

    const [rowIdx, colIdx] = lastPressedCell;
    let teamType = cells[arrayIndexToIdx(lastPressedCell[0], lastPressedCell[1], cellCount)];
    let winCells: number[] = [];

    // check col

    let validCount = 1;

    for (let i = rowIdx - 1; i >= 0; i--) { // go up
      const cellIdx = arrayIndexToIdx(i, colIdx, cellCount);

      if (cells[cellIdx] === teamType) {
        validCount++;
        winCells.push(cellIdx);
      }
      else
        break;
    }

    if (validCount === maxCountWin) {
      winCells.push(arrayIndexToIdx(lastPressedCell[0], lastPressedCell[1], cellCount));
      onWinGame(winCells);
      return;
    }

    for (let i = rowIdx + 1; i < cellCount; i++) { // go down      
      const cellIdx = arrayIndexToIdx(i, colIdx, cellCount);

      if (cells[cellIdx] === teamType) {
        validCount++;
        winCells.push(cellIdx);
      }
      else
        break;
    }

    if (validCount === maxCountWin) {
      winCells.push(arrayIndexToIdx(lastPressedCell[0], lastPressedCell[1], cellCount));
      onWinGame(winCells);
      return;
    }

    // check row

    validCount = 1;
    winCells = [];

    for (let i = colIdx - 1; i >= 0; i--) { // go left      
      const cellIdx = arrayIndexToIdx(rowIdx, i, cellCount);

      if (cells[cellIdx] === teamType) {
        validCount++;
        winCells.push(cellIdx);
      }
      else
        break;
    }

    if (validCount === maxCountWin) {
      winCells.push(arrayIndexToIdx(lastPressedCell[0], lastPressedCell[1], cellCount));
      onWinGame(winCells);
      return;
    }

    for (let i = colIdx + 1; i < cellCount; i++) { // go right
      const cellIdx = arrayIndexToIdx(rowIdx, i, cellCount);

      if (cells[cellIdx] === teamType) {
        validCount++;
        winCells.push(cellIdx);
      }
      else
        break;
    }

    if (validCount === maxCountWin) {
      winCells.push(arrayIndexToIdx(lastPressedCell[0], lastPressedCell[1], cellCount));
      onWinGame(winCells);
      return;
    }

    // check left cross

    validCount = 1;
    winCells = [];

    for (let c = colIdx - 1, r = rowIdx - 1; r >= 0 && c >= 0; r--, c--) { // go left up
      const cellIdx = arrayIndexToIdx(r, c, cellCount);

      if (cells[cellIdx] === teamType) {
        validCount++;
        winCells.push(cellIdx);
      }
      else
        break;
    }

    if (validCount === maxCountWin) {
      winCells.push(arrayIndexToIdx(lastPressedCell[0], lastPressedCell[1], cellCount));
      onWinGame(winCells);
      return;
    }

    for (let c = colIdx + 1, r = rowIdx + 1; r < cellCount && c < cellCount; r++, c++) { // go right down      
      const cellIdx = arrayIndexToIdx(r, c, cellCount);

      if (cells[cellIdx] === teamType) {
        validCount++;
        winCells.push(cellIdx);
      }
      else
        break;
    }

    if (validCount === maxCountWin) {
      winCells.push(arrayIndexToIdx(lastPressedCell[0], lastPressedCell[1], cellCount));
      onWinGame(winCells);
      return;
    }

    // check right cross

    validCount = 1;
    winCells = [];

    for (let c = colIdx + 1, r = rowIdx - 1; r >= 0 && c < cellCount; r--, c++) { // go right up
      const cellIdx = arrayIndexToIdx(r, c, cellCount);

      if (cells[cellIdx] === teamType) {
        validCount++;
        winCells.push(cellIdx);
      }
      else
        break;
    }

    if (validCount === maxCountWin) {
      winCells.push(arrayIndexToIdx(lastPressedCell[0], lastPressedCell[1], cellCount));
      onWinGame(winCells);
      return;
    }

    for (let c = colIdx - 1, r = rowIdx + 1; r < cellCount && c >= 0; r++, c--) { // go left down
      const cellIdx = arrayIndexToIdx(r, c, cellCount);

      if (cells[cellIdx] === teamType) {
        validCount++;
        winCells.push(cellIdx);
      }
      else
        break;
    }

    if (validCount === maxCountWin) {
      winCells.push(arrayIndexToIdx(lastPressedCell[0], lastPressedCell[1], cellCount));
      onWinGame(winCells);
      return;
    }
  }, [cells, lastPressedCell, cellCount, state]);

  // effect - on change state, reset,...

  useEffect(() => {
    if (state === State.StartScreen) {
      setJoinRoomCode('');
      setCopiedCode(false);
      setUserInputCode('');
      setCurrentTurn('x');
      setIsWon(false);
      setMultiDevicerMode(MultiDeviceMode.OneDevice);
      setShouldStartGame(false);
      myTeamType.current = 'x';

      playAnimStartScreen(true);
    }
    else if (state === State.CreateNewGame) {
      playAnimNewGameScreen(true);
    }
    else if (state === State.JoinRoom) {
      playAnimJoinRoomScreen(true);
    }
    else if (state === State.SetupNewRoom) {
      playAnimSetupNewRoomScreen(true);
    }

    //  unsubcribe events

    if (state !== State.SetupNewRoom && unsubscribeWaitingJoinRoom.current) {
      unsubscribeWaitingJoinRoom.current();
      unsubscribeWaitingJoinRoom.current = null;
      console.log('unsubcribe unsubscribeWaitingJoinRoom');
    }
  }, [state]);

  // init once

  useEffect(() => {
    FirebaseInit();

    const keyboardShowedListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardShowed(true));
    const keyboardHidedListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardShowed(false));

    return () => {
      keyboardShowedListener.remove();
      keyboardHidedListener.remove();
    }
  }, []);

  // main render

  return (
    <View pointerEvents={isHandling ? 'none' : 'auto'} style={style.masterView}>
      {/* start screen state */}
      {
        state !== State.StartScreen ? null :
          <View style={style.startScreenMasterView}>
            <Animated.Text style={[style.screenTitleTxt, { transform: [{ scale: animVal1 }] }]}>Tic Tac Toe</Animated.Text>
            <TouchableOpacity onPress={onPressNewGame_StartScreen}>
              <Animated.Text style={[style.menuButtonTxt, { transform: [{ scale: animVal2 }] }]}>New Game</Animated.Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onPressJoinRoom_StartScreen}>
              <Animated.Text style={[style.menuButtonTxt, { transform: [{ scale: animVal3 }] }]}>Join Room</Animated.Text>
            </TouchableOpacity>
          </View>
      }
      {/* new game state */}
      {
        state !== State.CreateNewGame ? null :
          <View style={style.startScreenMasterView}>
            <Text style={style.screenTitleTxt}>Create New Game</Text>
            <TouchableOpacity onPress={() => onPressDeviceMode_CreateNewGameScreen(true)}>
              <Animated.Text style={[style.menuButtonTxt, { transform: [{ translateX: animVal1 }] }]}>Play on 1 Device</Animated.Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onPressDeviceMode_CreateNewGameScreen(false)}>
              <Animated.Text style={[style.menuButtonTxt, { transform: [{ translateX: animVal2 }] }]}>Play on 2 Devices</Animated.Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onPressBackHome(State.CreateNewGame)}>
              <Animated.Text style={[style.menuButtonTxt, { transform: [{ translateX: animVal3 }] }]}>Back Home</Animated.Text>
            </TouchableOpacity>
            <Text style={style.cellUnitsTxt}>Cell Units:</Text>
            <SelectDropdown
              data={CELL_COUNT_DROPDOWN_VALUES}
              defaultValue={cellCount}
              onSelect={(selectedItem, _) => { setCellCount(selectedItem); }}
              buttonStyle={style.cellCountDropDown}
            />
          </View>
      }
      {/* setup new room state */}
      {
        state !== State.SetupNewRoom ? null :
          <View style={style.startScreenMasterView}>
            <Text style={style.screenTitleTxt}>Create New Room</Text>
            <Text style={style.instructionTxt}>Send this code to your friend for joining the room:</Text>
            {
              joinRoomCode === '' ? <ActivityIndicator size={'large'} color='black' /> :
                <Text style={style.roomCodeTxt}>{joinRoomCode}</Text>
            }
            <TouchableOpacity disabled={copiedCode || joinRoomCode === ''} onPress={onPressCopyCode_CreateNewRoomScreen}>
              <Animated.Text style={[{ transform: [{ scaleX: animVal1 }] }, style.menuButtonTxt, joinRoomCode === '' || copiedCode ? { backgroundColor: 'black' } : null]}>{copiedCode ? 'Copied' : 'Copy'}</Animated.Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onPressBackHome(State.SetupNewRoom)}>
              <Animated.Text style={[style.menuButtonTxt, { transform: [{ scaleX: animVal2 }] }]}>Back Home</Animated.Text>
            </TouchableOpacity>

            {
              joinRoomCode === '' ? null :
                <View style={style.waitingFriendJoinRoomView}>
                  <ActivityIndicator size={'large'} color='black' />
                  <Text style={style.waitFriendJoinTxt} >Waiting your friend join the room!</Text>
                </View>
            }
          </View>
      }
      {/* join room state */}
      {
        state !== State.JoinRoom ? null :
          <View style={[
            style.startScreenMasterView,
            keyboardShowed ? { paddingBottom: hp('7%') } : null,
          ]}>
            <Text style={style.screenTitleTxt}>Join Room</Text>
            <Animated.Text style={[style.instructionTxt, { transform: [{ translateX: animVal1 }] }]}>Enter room code:</Animated.Text>
            <AnimatedTextInput
              style={[style.enterRoomCodeTI, { transform: [{ translateX: animVal1 }] }]}
              maxLength={4}
              value={userInputCode}
              onChangeText={onEnteringJoinCode}
            />
            <TouchableOpacity disabled={userInputCode.length < 4} onPress={() => onPressJoin_JoinRoomScreen(false)}>
              <Animated.Text style={[
                style.menuButtonTxt,
                userInputCode.length >= 4 ? null :
                  {
                    backgroundColor: 'black',
                  },
                {
                  transform: [{ translateX: animVal2 }]
                },
              ]}>{isHandling ? 'Joining...' : 'Join'}</Animated.Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onPressBackHome(State.JoinRoom)}>
              <Animated.Text style={[style.menuButtonTxt, { transform: [{ translateX: animVal3 }] }]}>Back Home</Animated.Text>
            </TouchableOpacity>
          </View>
      }
      {/* playing state */}
      {
        state !== State.Playing ? null :
          <View style={style.playingMasterView}>
            {/* goal text */}
            <Text style={style.goalTxt}>Goal: {maxCountWin} cells in a row.</Text>
            {/* your team text */}
            {
              multiDeviceMode === MultiDeviceMode.OneDevice ? null :
                <Text style={style.goalTxt}>Your team: {myTeamType.current.toUpperCase()}</Text>
            }
            {/* turn text */}
            {
              isWon ?
                // @ts-ignore
                <Text style={style.turnTxt}>{cells[winCellIdxs[0]].toUpperCase()} Won!!</Text> :
                <View style={style.turnOfView}>
                  <Text style={style.turnTxt}>{myTeamType.current === currentTurn ? 'Your turn!' : "Friend's turn"}</Text>
                  {
                    !isMultiDevicesAndFriendTurn ? null :
                      <ActivityIndicator color='black' />
                  }
                </View>
            }
            {/* flatlist */}
            <View pointerEvents={disableCellsInteraction ? 'none' : 'auto'} style={CommonStyle.flex_1}>
              <FlatList
                data={cells}
                numColumns={cellCount}
                renderItem={renderCell}
                initialNumToRender={50}
              />
            </View>
            <View style={style.playingButtonsContainerView}>
              {
                multiDeviceMode === MultiDeviceMode.TwoDevice ? null :
                  <Button color='black' title='Reset' onPress={onPressReset_PlayingScreen} />
              }
              <Button color='black' title='Back Home' onPress={() => onPressBackHome_PlayingScreen(true)} />
            </View>
          </View>
      }
    </View>
  )
}

export default Game

const style = StyleSheet.create({
  masterView: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'white',
  },

  startScreenMasterView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Constants.marginPercentHeight_a,
  },

  playingButtonsContainerView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Constants.marginPercentHeight_a,
    marginBottom: Constants.marginPercentHeight_a,
  },

  playingMasterView: {
    flex: 1,
    alignItems: 'center',
    gap: Constants.marginPercentHeight_a,
  },

  turnOfView:
  {
    flexDirection: 'row',
    gap: Constants.marginPercentWidth_a,
  },

  cellView: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  waitingFriendJoinRoomView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Constants.marginPercentWidth_a,
    marginHorizontal: Constants.marginPercentHeight_d,
  },

  screenTitleTxt: {
    fontSize: Constants.fontSizePercent_big,
    fontWeight: 'bold',
    color: 'black'
  },

  cellCountDropDown: {
    width: wp('20%'),
    borderRadius: Constants.borderRadius_a,
  },

  enterRoomCodeTI: {
    width: wp('50%'),
    borderRadius: Constants.borderRadius_a,
    backgroundColor: '#e3e3e3',
    color: 'black',
    fontSize: Constants.fontSizePercent_big,
    textAlign: 'center',
    fontWeight: 'bold',
  },

  menuButtonTxt: {
    fontSize: Constants.fontSizePercent_normal,
    paddingVertical: Constants.marginPercentHeight_a,
    width: wp('50%'),
    backgroundColor: MAIN_COLOR,
    borderRadius: Constants.borderRadius_a,
    textAlign: 'center',
    color: 'white'
  },

  cellUnitsTxt: {
    fontSize: Constants.fontSizePercent_normal,
    marginTop: Constants.marginPercentHeight_b,
    textAlign: 'center',
  },

  roomCodeTxt: {
    fontSize: Constants.fontSizePercent_big,
    textAlign: 'center',
    fontWeight: 'bold',
    color: MAIN_COLOR,
  },

  instructionTxt: {
    fontSize: Constants.fontSizePercent_normal,
    marginTop: Constants.marginPercentHeight_b,
    marginHorizontal: Constants.marginPercentHeight_d,
    textAlign: 'center',
    color: 'gray',
  },

  cellTxt: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
  },

  goalTxt: {
    marginTop: Constants.marginPercentHeight_a,
    fontSize: Constants.fontSizePercent_normal,
    color: 'black',
  },

  turnTxt: {
    fontSize: Constants.fontSizePercent_big,
    color: 'black',
  },

  waitFriendJoinTxt: {
    fontSize: Constants.fontSizePercent_normal,
    color: 'black',
  }
})

function indexToArrayIndex(index: number, cellCount: number): [number, number] {
  const row = Math.trunc(index / cellCount);
  const col = index % cellCount;
  return [row, col];
}

const arrayIndexToIdx = (rowIdx: number, colIdx: number, cellCount: number) => {
  return rowIdx * cellCount + colIdx;
}

const roomFirebaseRLP = (roomCode: string) => {
  return 'tictactoe/rooms/' + roomCode;
}

const Cell = (
  {
    item,
    index,
    winCellIdxs,
    onPressCell,
    isWon,
    cellSize,
    isMultiDevicesAndFriendTurn,
  }:
    {
      item: CellContent,
      index: number,
      winCellIdxs: number[] | null,
      onPressCell: (index: number, isMe: boolean) => void,
      isWon: boolean,
      cellSize: number,
      isMultiDevicesAndFriendTurn: boolean,
    }) => {
  const isWinCell = winCellIdxs !== null && winCellIdxs.includes(index);
  const anim = useRef(new Animated.Value(0)).current;
  const playedAnim = useRef(false);

  // effect - launch cell

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      delay: index * 20,
    }).start(() => playedAnim.current = true);
  }, []);

  return <AnimatedTouchableOpacity
    onPress={() => onPressCell(index, true)}
    style={[
      playedAnim.current ? null : { transform: [{ scale: anim }] },
      style.cellView,
      {
        backgroundColor: isWon ? 'gray' : (isMultiDevicesAndFriendTurn ? '#a7fca9' : MAIN_COLOR),
        margin: CELL_MARGIN,
        width: cellSize,
        height: cellSize
      }
    ]}>
    <Text style={[
      style.cellTxt,
      {
        fontSize: cellSize / 1.5,
        color: isWinCell ? WIN_TEXT_COLOR : 'white',
      }
    ]}>{item}</Text>
  </AnimatedTouchableOpacity>
}