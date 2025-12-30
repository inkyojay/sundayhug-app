/**
 * 카메라 서비스
 * react-native-image-picker 래퍼
 */

import { Alert, Platform, PermissionsAndroid } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';

export interface CameraResult {
  uri: string;
  base64?: string;
  fileName?: string;
  type?: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

const DEFAULT_OPTIONS: CameraOptions & ImageLibraryOptions = {
  mediaType: 'photo',
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: 1920,
  includeBase64: false,
  saveToPhotos: false,
};

/**
 * Android 카메라 권한 요청
 */
async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: '카메라 권한 필요',
        message: '수면 환경 사진을 촬영하기 위해 카메라 권한이 필요합니다.',
        buttonNeutral: '나중에',
        buttonNegative: '거부',
        buttonPositive: '허용',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error('Camera permission error:', err);
    return false;
  }
}

/**
 * Android 갤러리 권한 요청
 */
async function requestGalleryPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  // Android 13+ 는 READ_MEDIA_IMAGES 사용
  const permission =
    Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  try {
    const granted = await PermissionsAndroid.request(permission, {
      title: '갤러리 권한 필요',
      message: '사진을 선택하기 위해 갤러리 권한이 필요합니다.',
      buttonNeutral: '나중에',
      buttonNegative: '거부',
      buttonPositive: '허용',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error('Gallery permission error:', err);
    return false;
  }
}

/**
 * 이미지 피커 응답 처리
 */
function handleResponse(response: ImagePickerResponse): CameraResult | null {
  if (response.didCancel) {
    console.log('User cancelled image picker');
    return null;
  }

  if (response.errorCode) {
    console.error('ImagePicker Error:', response.errorMessage);
    Alert.alert('오류', response.errorMessage || '이미지를 가져오는데 실패했습니다.');
    return null;
  }

  const asset = response.assets?.[0];
  if (!asset || !asset.uri) {
    Alert.alert('오류', '이미지를 가져오는데 실패했습니다.');
    return null;
  }

  return {
    uri: asset.uri,
    base64: asset.base64,
    fileName: asset.fileName,
    type: asset.type,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize,
  };
}

/**
 * 카메라로 사진 촬영
 */
export async function takePhoto(
  options?: Partial<CameraOptions>
): Promise<CameraResult | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    Alert.alert(
      '권한 필요',
      '카메라를 사용하려면 설정에서 권한을 허용해주세요.',
      [{ text: '확인' }]
    );
    return null;
  }

  return new Promise((resolve) => {
    launchCamera(
      { ...DEFAULT_OPTIONS, ...options },
      (response) => {
        resolve(handleResponse(response));
      }
    );
  });
}

/**
 * 갤러리에서 사진 선택
 */
export async function pickImage(
  options?: Partial<ImageLibraryOptions>
): Promise<CameraResult | null> {
  const hasPermission = await requestGalleryPermission();
  if (!hasPermission) {
    Alert.alert(
      '권한 필요',
      '갤러리를 사용하려면 설정에서 권한을 허용해주세요.',
      [{ text: '확인' }]
    );
    return null;
  }

  return new Promise((resolve) => {
    launchImageLibrary(
      { ...DEFAULT_OPTIONS, ...options },
      (response) => {
        resolve(handleResponse(response));
      }
    );
  });
}

/**
 * 카메라 또는 갤러리 선택 모달
 */
export function showImagePicker(): Promise<CameraResult | null> {
  return new Promise((resolve) => {
    Alert.alert(
      '사진 선택',
      '사진을 어떻게 가져올까요?',
      [
        {
          text: '카메라로 촬영',
          onPress: async () => {
            const result = await takePhoto();
            resolve(result);
          },
        },
        {
          text: '갤러리에서 선택',
          onPress: async () => {
            const result = await pickImage();
            resolve(result);
          },
        },
        {
          text: '취소',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}



