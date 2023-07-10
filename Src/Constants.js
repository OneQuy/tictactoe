import { Dimensions, StyleSheet } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

// window size

export const windowSize = Dimensions.get('window');

// const style

export const Constants = {
  fontSizePercent_normal: hp('3%'),
  fontSizePercent_big: hp('6%'),

  borderRadius_a: 15,
  borderRadius_b: 35,
  borderRadius_c: 25,
  borderRadius_d: 5,

  borderWidth: 2,

  margin_a: 10,
  margin_b: 20,

  marginPercentHeight_a: hp('2%'),
  marginPercentHeight_b: hp('3%'),
  marginPercentHeight_c: hp('1%'),
  marginPercentHeight_d: hp('5%'),

  marginPercentWidth_a: wp('5%'),
  marginPercentWidth_b: wp('8%'),
  marginPercentWidth_c: wp('3%'),

  wp100Percent: wp('100%')
};

// style

export const CommonStyle = StyleSheet.create({
  flex_1: {
    flex: 1,
  },
});
