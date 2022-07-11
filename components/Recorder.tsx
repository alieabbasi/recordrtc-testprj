import { FC } from "react";
import { useEffect, useRef, useState } from "react";
import RecordRTC from "recordrtc";
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
  const [recorder, setRecorder] = useState<RecordRTC | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentCam, setCurrentCam] = useState<"user" | "environment">("user");
  const [sizes, setSizes] = useState<{ width: number; height: number }>();

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
    // getDevices();
  };

  const getMaxSizes = async (facingMode: "user" | "environment") => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode } });
    let width: number = 0,
      height: number = 0;
    stream.getTracks().forEach((track) => {
      width = track.getCapabilities().width!.max!;
      height = track.getCapabilities().height!.max!;
    });
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
          });
        });
    });

    console.log("Video Devices:", mediaDevices);
    return mediaDevices;
  };

  const getUserMedia = async (facingMode: "user" | "environment") => {
    try {
      const sizes = await getMaxSizes(facingMode);
      setSizes(sizes);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode },
      });
      if (videoElRef.current) {
        videoElRef.current.srcObject = stream;
        setStream(stream);
      }
    } catch (err) {
      alert("Unable to capture your camera. Please check console logs.");
      console.error(err);
    }
  };

  const changeDevice = () => {
    if (!stream) {
      console.log("No Stream!!!");
      return;
    }
    stream.getTracks().forEach((track) => {
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
    if (stream) {
      const recorder = new RecordRTC(stream, { type: "video" });
      recorder.startRecording();
      setRecorder(recorder);
      setState(States.RECORDING);
    }
  };

  const resumeRecording = () => {
    recorder?.resumeRecording();
    setState(States.RECORDING);
  };

  const pauseRecording = () => {
    recorder?.pauseRecording();
    setState(States.PAUSED);
  };

  const stopRecording = async () => {
    if (videoElRef.current) {
      recorder?.stopRecording(() => {
        videoElRef.current!.srcObject = null;
        videoElRef.current!.src = window.URL.createObjectURL(recorder!.getBlob());
        recorder?.destroy();
        setRecorder(null);
        setState(States.RECORDED);
      });
    }
  };

  const recordAgain = () => {
    videoElRef.current!.srcObject = stream;
    setState(States.IDLE);
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className="h-full max-h-full max-w-full mx-auto aspect-3/4 bg-slate-600 relative">
        {state === States.IDLE && (
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
  );
};

export default Recorder;
