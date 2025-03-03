import {
  DatePicker,
  InputGroup,
  LocationIcon,
  TextInput,
} from "@components/atoms";
import { TextInputRef } from "@components/atoms/TextInput";
import { FormV2 } from "@components/molecules/FormV2";
import { InputGroupRef } from "@components/molecules/InputGroup";
import { grid } from "@constants";
import { editEntry } from "@features/diary/reducer";
import useEntry from "@hooks/diary/useEntry";
import { useAppDispatch } from "@lib/useAppDispatch";
import { createLogger } from "@logger/createLogger";
import { useAccessibleTitle } from "@navigation/hooks/useAccessibleTitle";
import { useFocusEffect } from "@react-navigation/native";
import { StackScreenProps } from "@react-navigation/stack";
import { unwrapResult } from "@reduxjs/toolkit";
import { calcCheckInMaxDate, calcCheckInMinDate } from "@utils/checkInDate";
import {
  detailsValidation,
  placeOrActivityValidation,
  startDateValidation,
} from "@validations/validations";
import { MainStackParamList } from "@views/MainStack";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Alert, Keyboard } from "react-native";
import * as yup from "yup";

import { DiaryScreen } from "../screens";

interface Props
  extends StackScreenProps<MainStackParamList, DiaryScreen.DiaryEntry> {}

const schema = yup.object().shape({
  name: placeOrActivityValidation,
  startDate: startDateValidation,
  details: detailsValidation,
});

const { logWarning } = createLogger("EditDiaryEntryScreen.tsx");

export function EditDiaryEntryScreen(props: Props) {
  const { id } = props.route.params;
  const entry = useEntry(id);

  const dispatch = useAppDispatch();

  const { t } = useTranslation();

  const [name, setName] = useState<string>(entry.name);
  const [nameError, setNameError] = useState<string>("");
  const [startDate, setStartDate] = useState<number>(entry.startDate);
  const [dateError, setDateError] = useState<string>("");
  const [details, setDetails] = useState<string>(entry.details || "");
  const [detailsError, setDetailsError] = useState<string>("");

  const minimumDate = useRef(calcCheckInMinDate());
  const maximumDate = useRef(calcCheckInMaxDate());

  const savePressed = useRef(false);
  const discardConfirmed = useRef(false);
  const hasNoChanges = useMemo(
    () =>
      entry.name === name &&
      entry.startDate === startDate &&
      (entry.details === details || (entry.details == null && details === "")),
    [entry.name, entry.startDate, entry.details, name, startDate, details],
  );

  const handleBackPress = useCallback(() => {
    if (hasNoChanges || savePressed.current || discardConfirmed.current) {
      return false;
    } else {
      Alert.alert(
        "",
        t("screens:editDiaryEntry:areYouSure:message"),
        [
          {
            text: t("screens:editDiaryEntry:areYouSure:cancel"),
            onPress: () => {},
            style: "cancel",
          },
          {
            text: t("screens:editDiaryEntry:areYouSure:ok"),
            onPress: () => {
              discardConfirmed.current = true;
              props.navigation.goBack();
            },
          },
        ],
        { cancelable: false },
      );
      return true;
    }
  }, [hasNoChanges, props.navigation, t]);

  useEffect(() => {
    const unsubsribe = props.navigation.addListener("beforeRemove", (e) => {
      const result = handleBackPress();
      if (result) {
        e.preventDefault();
      }
    });
    return unsubsribe;
  }, [props.navigation, handleBackPress]);

  const cleanErrorMessages = () => {
    setDetailsError("");
  };

  const onDetailsChange = (text: string) => {
    setDetails(text);
  };

  const onSavePress = () => {
    savePressed.current = true;
    Keyboard.dismiss();

    cleanErrorMessages();
    schema
      .validate(
        {
          details,
          name,
          startDate,
        },
        { abortEarly: false },
      )
      .then(() => {
        const request = {
          id: entry.id,
          details,
          name,
          userId: entry.userId,
          startDate: new Date(startDate),
          type: entry.type,
        };

        return dispatch(editEntry(request));
      })
      .then(unwrapResult)
      .then(() => {
        props.navigation.navigate(DiaryScreen.DiaryEntry, {
          id,
        });
      })
      .catch((error: yup.ValidationError | Error) => {
        if (error instanceof yup.ValidationError && error.inner) {
          error.inner.forEach((item) => {
            switch (item.path) {
              case "name":
                setNameError(t(item.message));
                break;
              case "startDate":
                setDateError(t(item.message));
                break;
              case "details":
                setDetailsError(t(item.message));
                break;
            }
          });

          inputGroupRef.current?.focusError(...error.inner.map((x) => x.path));
        } else {
          Alert.alert(t("errors:generic"));
          logWarning(error);
        }
      });
  };

  const inputGroupRef = useRef<InputGroupRef | null>(null);

  // Delay focus to fix timing issue with InputGroup scrolling
  const placeInputRef = useRef<TextInputRef | null>(null);
  const detailsInputRef = useRef<TextInputRef | null>(null);

  useFocusEffect(
    useCallback(() => {
      const timeoutId = setTimeout(() => {
        if (entry.type === "scan" || entry.type === "nfc") {
          detailsInputRef.current?.focus();
        } else {
          placeInputRef.current?.focus();
        }
      }, 200);
      return () => clearTimeout(timeoutId);
    }, [entry.type]),
  );

  useAccessibleTitle();

  return (
    <FormV2
      buttonText={t("screens:editDiaryEntry:save")}
      onButtonPress={onSavePress}
      keyboardAvoiding={true}
    >
      <InputGroup ref={inputGroupRef}>
        <TextInput
          identifier="name"
          label={t("screens:editDiaryEntry:placeOrActivity")}
          disabled={entry.type === "scan" || entry.type === "nfc"}
          ref={placeInputRef}
          value={name}
          onChangeText={setName}
          errorMessage={nameError}
          clearErrorMessage={() => setNameError("")}
          renderIcon={
            <LocationIcon
              locationType={entry.type}
              isFavourite={entry.isFavourite}
            />
          }
        />
        <DatePicker
          dateTime={startDate}
          onDateChange={setStartDate}
          errorMessage={dateError}
          clearErrorMessage={() => setDateError("")}
          label={t("screens:addManualDiaryEntry:datePicker")}
          maximumDate={maximumDate.current}
          minimumDate={minimumDate.current}
          minuteInterval={5}
        />
        {(entry.type === "scan" || entry.type === "nfc") && (
          <TextInput
            label={t("screens:editDiaryEntry:address")}
            disabled={true}
            value={entry.address}
            multiline={true}
          />
        )}
        <TextInput
          identifier="details"
          ref={detailsInputRef}
          testID="editDiaryEntry:details"
          label={t("screens:editDiaryEntry:details")}
          value={details}
          onChangeText={onDetailsChange}
          info={t("screens:editDiaryEntry:disclaimer")}
          required="optional"
          multiline={true}
          numberOfLines={2}
          errorMessage={detailsError}
          clearErrorMessage={() => setDetailsError("")}
          returnKeyType="default"
          marginBottom={grid}
        />
      </InputGroup>
    </FormV2>
  );
}
