import { StyleSheet } from "react-native";

// regex (https://uibakery.io/regex-library)

export const RegEx_Word_Number_Underscore = /^[a-z0-9_]+$/;
export const RegEx_Basic_Email = /^\S+@\S+\.\S+$/;

// other

export const ErrorObject_Empty = { error: null, code: null };

// styles

export const CommonStyles = StyleSheet.create({        
    flex_1: 
    {
        flex: 1
    },

    width100PercentHeight100Percent: 
    {
        width: '100%',
        height: '100%',                
    },

    widthAndHeight100Percent_Absolute:
    {
        width: '100%',
        height: '100%',                
        position: 'absolute'
    },

    widthAndHeight0Percent: 
    {
        width: '0%',
        height: '0%',                
    },

	width100Percent_Height100Percent_PositionAbsolute_JustifyContentCenter_AlignItemsCenter:
    {
		position: 'absolute',
        width: '100%',
        height: '100%',                
        justifyContent: 'center', 
        alignItems: 'center',             
    },

    justifyContentCenter_AlignItemsCenter:
    {
        justifyContent: 'center', 
        alignItems: 'center',             
    },
});