from flask import Flask, request, render_template, jsonify
import pandas as pd
from model import get_model, make_prediction, fetch_data
from pycoingecko import CoinGeckoAPI
import logging
from datetime import datetime, timedelta

app = Flask(__name__)
cg = CoinGeckoAPI()

# Set up logging
logging.basicConfig(level=logging.DEBUG)

@app.route('/', methods=['GET', 'POST'])
def index():
    prediction = None
    error = None
    if request.method == 'POST':
        try:
            days_ahead = int(request.form.get('days_ahead'))
            if days_ahead <= 0 or days_ahead > 365:
                raise ValueError("Days ahead must be a positive integer between 1 and 365")
            
            model, df = get_model()
            forecast = make_prediction(model, days_ahead, df)
            
            prediction = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(days_ahead)
            prediction.columns = ['Date', 'Predicted Price', 'Lower Bound', 'Upper Bound']
            prediction.set_index('Date', inplace=True)
            
        except ValueError as e:
            logging.error(f"ValueError: {str(e)}")
            error = str(e)
        except Exception as e:
            logging.error(f"Unexpected error: {str(e)}")
            error = "An unexpected error occurred. Please try again."
    
    return render_template('index.html', prediction=prediction, error=error)

@app.route('/current_price', methods=['GET'])
def current_price():
    try:
        response = cg.get_price(ids='bitcoin', vs_currencies='usd')
        current_price = response['bitcoin']['usd']
        return jsonify({'price': current_price})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/historical_prices', methods=['GET'])
def historical_prices():
    try:
        df = fetch_data()
        data = {
            'dates': df['ds'].dt.strftime('%Y-%m-%d').tolist(),
            'prices': df['y'].tolist()
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/historical_data', methods=['GET'])
def historical_data():
    try:
        df = fetch_data()
        data = {
            'dates': df['ds'].dt.strftime('%Y-%m-%d').tolist(),
            'prices': df['y'].tolist(),
            'volumes': df['volume'].tolist()
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)