import { $TextView } from "react-nativescript";
import { $FormattedString } from "react-nativescript";
import { $Span } from "react-nativescript";
import { $HtmlView } from "react-nativescript";
import { $ListPicker } from "react-nativescript";
import { $SearchBar } from "react-nativescript";
import { SearchBar } from "tns-core-modules/ui/search-bar";
import { $Button } from "react-nativescript";
// import { GestureEventData } from "tns-core-modules/ui/gestures/gestures";
import { $FlexboxLayout } from "react-nativescript";
import * as React from "react";
import { RouteProp } from '../@react-navigation/core';
import { FrameNavigationProp } from "../react-nativescript-navigation";
import { MainStackParamList } from "./NavigationParamList";
// import { StyleSheet } from "../react-nativescript";

export interface NearbyRestaurantsProps {
    route: RouteProp<MainStackParamList, "NearbyRestaurants">,
    navigation: FrameNavigationProp<MainStackParamList, "NearbyRestaurants">,
}

export const NearbyRestaurants = (props: NearbyRestaurantsProps) => {
    const { navigation } = props;
    const Geolocation = require("nativescript-geolocation");
    const http = require("tns-core-modules/http");
    let list = [{ name: "BK" }];
    // let filteredList = list;

    function getMyLocation() {
        Geolocation.enableLocationRequest();
        Geolocation.getCurrentLocation({
            desiredAccuracy: 100,
            updateDistance: 0.1,
            timeout: 20000
        }).then(
            loc => {
                if (loc) {
                    // this is your location data, may need to parse
                    console.log(loc);
                }
            },
            function (e) {
                console.log("Error: " + e.message);
            }
        );
    }

    function getMyRestaurants() {
        Geolocation.enableLocationRequest();
        Geolocation.getCurrentLocation({
            desiredAccuracy: 100,
            updateDistance: 0.1,
            timeout: 20000
        }).then(
            loc => {
                if (loc) {
                    const key = "AIzaSyAtamUkkMVPVhKh3GSyU5RzOd6YfTClD10";
                    const request = "your call type goes here, eg nearbysearch";
                    const output = "your output type here, eg json";
                    const parameters = "your parameters here";
                    const url = `https://maps.googleapis.com/maps/api/place/${request}/${output}?${parameters}&key=${key}`;
                    http.request({ // http is a separate module and similarly to the Geolocation module, you will need to import it by including "const http = require("tns-core-modules/http");" at the top of script
                        url: url,
                        method: "GET"
                    }).then(function (res) {
                        
                    }); // parseResponse is a method to be defined yourself
                }
            },
            function (e) {
                console.log("Error: " + e.message);
            }
        );
    }

    function parseResponse(res) {

    }

    // function filterRestaurants(event) {
    //     filteredList = [];
    //     let query = event.target.input;
    //     let equal = true;
    //     let i;
    //     for (i; i < list.length; i++) {
    //         let j;
    //         for (j; j < query.length; j++) {
    //             if (list[i].name !== query) {
    //                 equal = false;
    //             }
    //         }
    //         if (equal) {
    //             filteredList.push(list[i]);
    //         }
    //     }
    // }
    return (
        <$FlexboxLayout flexDirection="row">
            <$Button onTap={() => navigation.goBack()} text="Go back" />
            <$TextView editable={false}>
                <$FormattedString>
                    <$Span text="Nearby Restaurants" fontWeight={"bold"} />
                </$FormattedString>
            </$TextView>
            <$SearchBar hint="Search restaurants" text={this.searchPhrase} onSubmit={this.filterRestaurants} />
            <$ListPicker items={list} selectedIndex={this.selectedListPickerIndex} />
        </$FlexboxLayout>
    )
}