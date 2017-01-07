using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Net;
using System.Text;
using System.IO;


namespace CognitiveSearch.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }


        [HttpPost]
        public ActionResult GetToken(string Key)
        {
            string strToken = "";

            var webReq = (HttpWebRequest)WebRequest.Create("https://api.cognitive.microsoft.com/sts/v1.0/issueToken");

            webReq.Method = "POST";
            webReq.ContentType = "application/x-www-form-urlencoded";
            webReq.Headers.Add("Ocp-Apim-Subscription-Key", Key);
            webReq.ContentLength = 0;

            var reqStream = webReq.GetRequestStream();
            reqStream.Write(new byte[] { }, 0, 0);
            reqStream.Close();

            var webResp = (HttpWebResponse)webReq.GetResponse();
            using (var reader = new System.IO.StreamReader(webResp.GetResponseStream(), ASCIIEncoding.ASCII))
            {
                strToken = reader.ReadToEnd();
            }
            
            return Json(strToken);
        }

        [HttpPost]
        public ActionResult GetTextFromSpeech(FormCollection collection)
        {
            string JWTToken = collection["Token"];
            byte[] fileData = null;

            using (var binaryReader = new BinaryReader(Request.Files[0].InputStream))
            {
                fileData = binaryReader.ReadBytes(Request.Files[0].ContentLength);
            }

            string strOutput = "";

            var webReq = (HttpWebRequest)WebRequest.Create("https://speech.platform.bing.com/recognize?" 
                + "scenarios=smd"
                + "&appid=f84e364c-ec34-4773-a783-73707bd9a585" 
                + "&locale=en-US" 
                + "&device.os=wp7" 
                + "&version=3.0" 
                + "&format=json" 
                + "&requestid=1d4b6030-9099-11e0-91e4-0800200c9a66" 
                + "&instanceid=1d4b6030-9099-11e0-91e4-0800200c9a66");

            webReq.Method = "POST";
            webReq.ContentType = "audio/wav; codec='audio/pcm'; samplerate=16000";
            webReq.Headers.Add("Authorization", "Bearer " + JWTToken);

            var reqStream = webReq.GetRequestStream();
            reqStream.Write(fileData, 0, fileData.Length);
            reqStream.Close();

            var webResp = (HttpWebResponse)webReq.GetResponse();
            using (var reader = new System.IO.StreamReader(webResp.GetResponseStream(), ASCIIEncoding.ASCII))
            {
                strOutput = reader.ReadToEnd();
            }
            

            return Json(strOutput);
        }
    }
}