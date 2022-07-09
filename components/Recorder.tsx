import { FC } from "react";
import { useEffect, useRef, useState } from "react";
import RecordRTC from "recordrtc";
import { Icon, IconifyIcon } from "@iconify/react";
import record12Regular from "@iconify/icons-fluent/record-12-regular";
import arrowCounterclockwise12Regular from "@iconify/icons-fluent/arrow-counterclockwise-12-regular";
import stop16Filled from "@iconify/icons-fluent/stop-16-filled";
import play12Filled from "@iconify/icons-fluent/play-12-filled";
import pause12Filled from "@iconify/icons-fluent/pause-12-filled";

enum States {
  IDLE,
  RECORDING,
  PAUSED,
  RECORDED,
}

interface RecorderProps {}

const Recorder: FC<RecorderProps> = () => {
  const [mediaDevices, setMediaDevices] = useState<MediaDeviceInfo[]>([]);
  const [state, setState] = useState<States>(States.IDLE);
  const [recorder, setRecorder] = useState<RecordRTC | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoElRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoElRef.current) {
      getUserMedia();
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

  const getUserMedia = async () => {
    try {
      const mediaDevices = (await navigator.mediaDevices.enumerateDevices()).filter(
        (device) => device.kind === "videoinput"
      );
      setMediaDevices(mediaDevices);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (videoElRef.current) {
        videoElRef.current.srcObject = stream;
        setStream(stream);
      }
    } catch (err) {
      alert("Unable to capture your camera. Please check console logs.");
      console.error(err);
      return null;
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
        {mediaDevices && (
          <select value={mediaDevices[0].deviceId} className="absolute top-0 left-0 z-10">
            {mediaDevices.map((device) => (
              <option key={device.deviceId} value={device.groupId}>
                {device.label}
              </option>
            ))}
          </select>
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
          id="the-video"
          autoPlay
          playsInline
          controls={state === States.RECORDED ? true : false}
          muted={state === States.RECORDED ? false : true}
          className="w-full h-full"
          ref={videoElRef}
        ></video>
      </div>
    </div>
  );
};

export default Recorder;
