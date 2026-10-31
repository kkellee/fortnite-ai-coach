// Explicit opt-in downloads model weights; inference and chat stay on-device.
let engine;
self.onmessage=async ({data})=>{
 try{
  if(data.type==='load'){
   const {MLCEngine}=await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/+esm');
   engine=new MLCEngine({initProgressCallback:p=>self.postMessage({type:'progress',progress:p.progress,text:p.text}),logLevel:'ERROR'});
   await engine.reload(data.model,{context_window_size:4096});
   self.postMessage({type:'ready'});
  }
  if(data.type==='generate'){
   if(!engine)throw Error('Model not loaded');
   const stream=await engine.chat.completions.create({messages:data.messages,extra_body:{enable_thinking:false},stream:true,max_tokens:384,temperature:.4,top_p:.9,repetition_penalty:1.08});
   for await(const part of stream){const text=part.choices[0]?.delta?.content;if(text)self.postMessage({type:'chunk',text});}
   self.postMessage({type:'done'});
  }
  if(data.type==='stop')engine?.interruptGenerate();
 }catch(error){self.postMessage({type:'error',message:String(error.message||error).slice(0,1000)});}
};
