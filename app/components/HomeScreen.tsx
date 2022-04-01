import { $FlexboxLayout } from "react-nativescript";
import { $Button } from "react-nativescript";
// import { GestureEventData } from "tns-core-modules/ui/gestures/gestures";
import { $Label } from "react-nativescript";
import * as React from "react";
import { RouteProp } from '../@react-navigation/core';
// import { Dialogs } from '../@nativescript/core';
import { FrameNavigationProp } from "../react-nativescript-navigation";
import { StyleSheet } from "../react-nativescript";
import { MainStackParamList } from "./NavigationParamList";

type HomeScreenProps = {
    route: RouteProp<MainStackParamList, "Home">,
    navigation: FrameNavigationProp<MainStackParamList, "Home">,
}

export function HomeScreen({ navigation }: HomeScreenProps) {
    return (
        <$FlexboxLayout flexDirection="column">
            <$Label text="Welcome to MoBite" />
            <$Button onTap={() => navigation.navigate('NearbyRestaurants')} text="Nearby Restaurants" />
        </$FlexboxLayout>             
    );
}