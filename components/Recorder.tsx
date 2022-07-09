import { FC } from "react";
import { useEffect, useRef, useState } from "react";
import RecordRTC from "recordrtc";

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

  const videoElRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoElRef.current) {
      getUserMedia();
    }
  }, [videoElRef]);

  let mainButtonText = "";
  switch (state) {
    case States.IDLE:
      mainButtonText = "Start Recording";
      break;
    case States.PAUSED:
      mainButtonText = "Stop Recording";
      break;
    case States.RECORDED:
      mainButtonText = "Record Again";
      break;
    case States.RECORDING:
      mainButtonText = "Stop Recording";
      break;
  }

  const getUserMedia = async () => {
    try {
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
        startRecording();
        break;
    }
  };

  const startRecording = () => {
    if (stream) {
      videoElRef.current!.srcObject = stream;
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

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className="h-full max-h-full max-w-full mx-auto aspect-3/4 bg-slate-600 relative">
        <button className="absolute top-0 left-0 z-10 bg-green-600 text-white p-2" onClick={actionButtonHandler}>
          {mainButtonText}
        </button>
        {(state === States.RECORDING || state === States.PAUSED) && (
          <button
            className="absolute top-0 right-0 z-10 bg-blue-500 text-white p-2"
            onClick={() => (state === States.PAUSED ? resumeRecording() : pauseRecording())}
          >
            {state === States.PAUSED ? "Resume Recording" : "Pause Recording"}
          </button>
        )}
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
