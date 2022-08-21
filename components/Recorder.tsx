/* eslint-disable react-hooks/exhaustive-deps */
import { FC } from "react";
import { useEffect, useRef, useState } from "react";
import RecordRTC, { MediaStreamRecorder, MultiStreamRecorder } from "recordrtc";
import { Icon, IconifyIcon } from "@iconify/react";
import record12Regular from "@iconify/icons-fluent/record-12-regular";
import arrowCounterclockwise12Regular from "@iconify/icons-fluent/arrow-counterclockwise-12-regular";
import stop16Filled from "@iconify/icons-fluent/stop-16-filled";
import play12Filled from "@iconify/icons-fluent/play-12-filled";
import pause12Filled from "@iconify/icons-fluent/pause-12-filled";
import cameraSwitch20Filled from "@iconify/icons-fluent/camera-switch-20-filled";

enum States {
  IDLE,
  RECORDING,
  PAUSED,
  RECORDED,
}

interface RecorderProps {}

const Recorder: FC<RecorderProps> = () => {
  const [state, setState] = useState<States>(States.IDLE);
  const [recorder, setRecorder] = useState<MultiStreamRecorder | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [currentCam, setCurrentCam] = useState<"user" | "environment">("environment");
  const [sizes, setSizes] = useState<{ width: number | undefined; height: number | undefined }>();

  const videoElRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoElRef.current) {
      startDevice();
    }
  }, [videoElRef]);

  let mainButtonIcon: IconifyIcon;
  switch (state) {
    case States.IDLE:
      mainButtonIcon = record12Regular;
      break;
    case States.PAUSED:
      mainButtonIcon = stop16Filled;
      break;
    case States.RECORDED:
      mainButtonIcon = arrowCounterclockwise12Regular;
      break;
    case States.RECORDING:
      mainButtonIcon = stop16Filled;
      break;
  }

  const secondButtonIcon = state === States.PAUSED ? play12Filled : pause12Filled;

  const startDevice = async () => {
    await getUserMedia(currentCam);
    getDevices();
  };

  const getMaxSizes = async (facingMode: "user" | "environment") => {
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode } });
    } catch (err) {
      alert("Failed To Capture Stream in [getMaxSizes()] (( FacingMode: " + facingMode + " ))");
      return;
    }
    let width: number | undefined = undefined,
      height: number | undefined = undefined;
    try {
      stream.getTracks().forEach((track) => {
        width = track.getCapabilities().width?.max || undefined;
        height = track.getCapabilities().height?.max || undefined;
        alert("track's width:" + width + "\n track's height:" + height);
        
        if (!width || !height) return;

        if (width < (height * 3) / 4) {
          if (width > 1440) {
            width = 1440;
          }
          height = (width * 4) / 3;
        } else {
          if (height > 1920) {
            height = 1920;
          }
          width = (height * 3) / 4;
        }
        track.stop();
      });
    } catch (err) {
      return;
    }
    return { width, height };
  };

  const getDevices = async () => {
    const mediaDevices = (await navigator.mediaDevices.enumerateDevices()).filter(
      (device) => device.kind === "videoinput"
    );

    mediaDevices.forEach((device) => {
      navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            deviceId: { exact: device.deviceId },
          },
        })
        .then((stream) => {
          console.log("Found Video Input:", stream.id);
          stream.getTracks().forEach((track) => {
            console.log("Capabilities:", track.getCapabilities());
            console.log("Settings:", track.getSettings());
            track.stop();
          });
        });
    });

    console.log("Video Devices:", mediaDevices);
    return mediaDevices;
  };

  const getUserMedia = async (facingMode: "user" | "environment") => {
    try {
      const sizes = await getMaxSizes(facingMode);
      alert("Sizes:  " + JSON.stringify(sizes));
      setSizes(sizes);
      if (!audioStream) {
        const newAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        setAudioStream(newAudioStream);
      }

      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode, width: sizes?.width, height: sizes?.height },
      });
      if (videoElRef.current) {
        videoElRef.current.srcObject = newVideoStream;
        setVideoStream(newVideoStream);
        newVideoStream.getTracks().forEach(track => alert(`Track Dimensions: width = ${track.getSettings().width} & height = ${track.getSettings().height}`))

        if (recorder) {
          recorder.resetVideoStreams([newVideoStream, audioStream!]);
        }
      }
    } catch (err) {
      alert("Unable to capture your camera. Please check console logs.");
      console.error(err);
    }
  };

  const changeDevice = () => {
    if (!videoStream) {
      console.log("No Stream!!!");
      return;
    }
    videoStream.getTracks().forEach((track) => {
      track.stop();
    });
    if (currentCam === "user") {
      getUserMedia("environment");
      setCurrentCam("environment");
    } else {
      getUserMedia("user");
      setCurrentCam("user");
    }
  };

  const actionButtonHandler = () => {
    switch (state) {
      case States.IDLE:
        startRecording();
        break;
      case States.PAUSED:
        stopRecording();
        break;
      case States.RECORDING:
        stopRecording();
        break;
      case States.RECORDED:
        recordAgain();
        break;
    }
  };

  const startRecording = () => {
    if (audioStream && videoStream) {
      const recorder = new MultiStreamRecorder([audioStream, videoStream], { type: "video", recorderType: MultiStreamRecorder });
      console.log("RECORDER:", recorder);
      recorder.record();
      setRecorder(recorder);
      setState(States.RECORDING);
    }
  };

  const resumeRecording = () => {
    recorder?.resume();
    setState(States.RECORDING);
  };

  const pauseRecording = () => {
    recorder?.pause();
    setState(States.PAUSED);
  };

  const stopRecording = async () => {
    if (videoElRef.current) {
      recorder?.stop((blob) => {
        videoElRef.current!.srcObject = null;
        videoElRef.current!.src = window.URL.createObjectURL(blob);
        recorder?.clearRecordedData();
        setRecorder(null);
        setState(States.RECORDED);
      });
    }
  };

  const recordAgain = () => {
    videoElRef.current!.srcObject = videoStream;
    setState(States.IDLE);
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className="h-full max-h-full w-full max-w-full bg-slate-600 relative flex justify-center items-center">
        <div className="w-max object-cover relative">
          {state !== States.RECORDED && (
            <div className="flex absolute top-10 right-10 justify-center items-center">
              <button className="z-10 bg-black/50 text-white p-2 rounded-full" onClick={changeDevice}>
                <Icon icon={cameraSwitch20Filled} className="text-6xl" />
              </button>
            </div>
          )}
          <div className="flex absolute bottom-20 justify-center items-center w-full space-x-4">
            <button className="z-10 bg-black/50 text-white p-2 rounded-full" onClick={actionButtonHandler}>
              <Icon icon={mainButtonIcon} className="text-6xl text-red-400" />
            </button>
            {(state === States.RECORDING || state === States.PAUSED) && (
              <button
                className="z-10 bg-black/50 text-white p-2 rounded-full"
                onClick={() => (state === States.PAUSED ? resumeRecording() : pauseRecording())}
              >
                <Icon icon={secondButtonIcon} className="text-6xl" />
              </button>
            )}
          </div>
          <video
            className="w-full h-full object-cover"
            id="the-video"
            autoPlay
            playsInline
            controls={state === States.RECORDED ? true : false}
            muted={state === States.RECORDED ? false : true}
            ref={videoElRef}
          ></video>
          {sizes && <div className="z-10 absolute top-0 left-0 bg-white">{JSON.stringify(sizes)}</div>}
        </div>
      </div>
    </div>
  );
};

export default Recorder;
